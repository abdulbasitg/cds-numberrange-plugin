const cds = require("@sap/cds/lib")

describe('sample-01-sqlite-in-memory', ()=>{  
  const test = cds.test(`${__dirname}/..`);
  it('1 - Check if Books Entity is Empty', async () => {    
    const booksData = await test.GET('/odata/v4/catalog/Books');
    expect(booksData.data.value.length).to.equal(0);
  });  
  it('2 - Create a New Book Record', async () => {    
    const firstBooksData = await test.POST('/odata/v4/catalog/Books',{
      title: 'Test Book',
      stock : 1
    }); 
    expect(firstBooksData.data.bookid).to.equal(1);    
    expect(firstBooksData.data.bookidchar).to.equal('A00000001Z');    
    expect(firstBooksData.data.bookidpad).to.equal('0000000001');    
  });  
  it('3 - Create a Second Book Record', async () => {    
    const secondBookData = await test.POST('/odata/v4/catalog/Books',{
      title: 'Test Book',
      stock : 1
    }); 
    expect(secondBookData.data.bookid).to.equal(2);    
    expect(secondBookData.data.bookidchar).to.equal('A00000002Z');    
    expect(secondBookData.data.bookidpad).to.equal('0000000002');    
  });    
  it('4 - Check Total Created Records', async () => {
    const booksData = await test.GET('/odata/v4/catalog/Books');
    expect(booksData.data.value.length).to.equal(2);
  });
  // Verifies lock contention: tx1 holds the lock (with a deliberate delay), tx2 starts during
  // tx1's hold, and must read the UPDATED value (not the stale pre-commit value).
  // This proves that tx2's SELECT waited for tx1 to commit before it could read.
  it('5 - ForUpdate lock contention: tx2 reads after tx1 commits', async () => {
    const { Ranges } = cds.services.NumberRangePluginService.entities;
    const HOLD_MS = 150;
    const log = [];

    // tx1: lock the row, hold for HOLD_MS, then increment and commit
    const tx1 = cds.db.tx(async tx => {
      const row = await tx.run(
        SELECT.one.from(Ranges).columns('CurrentValue','IncrementBy').where({ RangeName: 'BOOKID' }).forUpdate({ wait: 5 })
      );
      log.push({ who: 'tx1', event: 'read', value: row.CurrentValue, t: Date.now() });
      await new Promise(r => setTimeout(r, HOLD_MS)); // deliberately hold the lock
      await tx.run(UPDATE(Ranges).where({ RangeName: 'BOOKID' }).set({ CurrentValue: row.CurrentValue + row.IncrementBy }));
      log.push({ who: 'tx1', event: 'committed', t: Date.now() });
      return row.CurrentValue;
    });

    // tx2: starts 30ms into tx1's hold, must wait for tx1 to commit before its SELECT completes
    const tx2 = new Promise(r => setTimeout(r, 30)).then(() =>
      cds.db.tx(async tx => {
        log.push({ who: 'tx2', event: 'attempting', t: Date.now() });
        const row = await tx.run(
          SELECT.one.from(Ranges).columns('CurrentValue','IncrementBy').where({ RangeName: 'BOOKID' }).forUpdate({ wait: 5 })
        );
        log.push({ who: 'tx2', event: 'read', value: row.CurrentValue, t: Date.now() });
        await tx.run(UPDATE(Ranges).where({ RangeName: 'BOOKID' }).set({ CurrentValue: row.CurrentValue + row.IncrementBy }));
        return row.CurrentValue;
      })
    );

    const [v1, v2] = await Promise.all([tx1, tx2]);

    console.log('[lock-contention] event log:');
    const startTime = log[0]?.t ?? 0;
    log.forEach(entry => {
      const rel = entry.t != null ? `+${entry.t - startTime}ms` : '      ';
      const val = entry.value != null ? ` value=${entry.value}` : '';
      console.log(`  ${rel.padStart(8)}  ${entry.who} → ${entry.event}${val}`);
    });
    console.log(`[lock-contention] tx1 returned ${v1}, tx2 returned ${v2}`);

    // tx2 must read tx1's committed value (not the stale pre-commit value)
    expect(v1).to.not.equal(v2);
    expect(v2).to.equal(v1 + 1);

    // Verify tx2 read only AFTER tx1 committed
    const tx1CommitTime = log.find(l => l.who === 'tx1' && l.event === 'committed').t;
    const tx2ReadTime   = log.find(l => l.who === 'tx2' && l.event === 'read').t;
    expect(tx2ReadTime).to.be.at.least(tx1CommitTime);
  });

  // Verifies that concurrent creates each receive a unique bookid (no duplicates from race condition).
  // If a row lock cannot be acquired within 5s, the CREATE fails with "Failed to acquire lock for
  // range <name>: ..." — no silent duplicate value is returned.
  it('6 - Concurrent Create: All bookids are unique', async () => {
    const concurrentCount = 5;
    const results = await Promise.all(
      Array.from({ length: concurrentCount }, () =>
        test.POST('/odata/v4/catalog/Books', { title: 'Concurrent Book', stock: 1 })
      )
    );
    const ids = results.map(r => r.data.bookid);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).to.equal(concurrentCount);
  });

})