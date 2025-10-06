const cds = require('@sap/cds');
const test = cds.test('serve','all','--profile','local-multitenancy');
const { expect } = require('chai');

describe("sample-05-sqlite-mtxs-embedded", () => {
    it('0 - Reset subscriptions', async () => {
        expect((await test.POST("/-/cds/deployment/unsubscribe", { "tenant": "t1" }, { auth: { username: 'yves' } })).status).to.equal(204);
        expect((await test.POST("/-/cds/deployment/unsubscribe", { "tenant": "t2" }, { auth: { username: 'yves' } })).status).to.equal(204);
    });
    
    it('1 - Subscribe Tenant t1', async () => {
        const { status } = await test.POST("/-/cds/deployment/subscribe", { "tenant": "t1" }, { auth: { username: 'yves' } });
        expect(status).to.equal(204);
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'alice' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(1);
        });
    });

    it('2 - Check Books entity is empty for tenant 1', async () => {
        const booksData = await test.GET('/odata/v4/catalog/Books', { auth: { username: 'alice' } });
        expect(booksData.data.value.length).to.equal(0);    
    });

    it('3 - Create a New Book Record for tenant 1', async () => {    
        const firstBooksData = await test.POST('/odata/v4/catalog/Books',{
          title: 'Test Book t1',
          stock : 1
        }, { auth: { username: 'alice' } }); 
        expect(firstBooksData.data.bookid).to.equal(1);    
        expect(firstBooksData.data.bookidchar).to.equal('A00000001Z');    
        expect(firstBooksData.data.bookidpad).to.equal('0000000001');
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'alice' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(2);
        });        
    });

    it('4 - Subscribe Tenant t2', async () => {
        const { status } = await test.POST("/-/cds/deployment/subscribe", { "tenant": "t2" }, { auth: { username: 'yves' } });
        expect(status).to.equal(204);
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'erin' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(1);
        });
    });

    it('5 - Check Books entity is empty for tenant 2', async () => {
        const booksData = await test.GET('/odata/v4/catalog/Books', { auth: { username: 'erin' } });
        expect(booksData.data.value.length).to.equal(0);    
    });

    it('6 - Create a New Book Record for tenant 2', async () => {    
        const firstBooksData = await test.POST('/odata/v4/catalog/Books',{
          title: 'Test Book t2',
          stock : 1
        }, { auth: { username: 'erin' } }); 
        expect(firstBooksData.data.bookid).to.equal(1);    
        expect(firstBooksData.data.bookidchar).to.equal('A00000001Z');    
        expect(firstBooksData.data.bookidpad).to.equal('0000000001');
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'erin' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(2);
        });        
    });

    it('7 - Create second Book Records for tenant 1', async () => {    
        const secondBooksData = await test.POST('/odata/v4/catalog/Books',{
          title: 'Test Book 2 t1',
          stock : 1
        }, { auth: { username: 'alice' } }); 
        expect(secondBooksData.data.bookid).to.equal(2);    
        expect(secondBooksData.data.bookidchar).to.equal('A00000002Z');    
        expect(secondBooksData.data.bookidpad).to.equal('0000000002');
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'alice' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(3);
        });
        
    });

    it('8 - Create third book record for tenant 1', async () => {
        const thirdBooksData = await test.POST('/odata/v4/catalog/Books',{
          title: 'Test Book 3 t1',
          stock : 1
        }, { auth: { username: 'alice' } }); 
        expect(thirdBooksData.data.bookid).to.equal(3);    
        expect(thirdBooksData.data.bookidchar).to.equal('A00000003Z');    
        expect(thirdBooksData.data.bookidpad).to.equal('0000000003');
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'alice' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(4);
        });
    });

    it('9 - Check Books entity for tenant 1 has 3 records', async () => {
        const booksData = await test.GET('/odata/v4/catalog/Books', { auth: { username: 'alice' } });
        expect(booksData.data.value.length).to.equal(3);    
    });

    it('10 - Check Books entity for tenant 2 has 1 record', async () => {
        const booksData = await test.GET('/odata/v4/catalog/Books', { auth: { username: 'erin' } });
        expect(booksData.data.value.length).to.equal(1);    
    });

    it('11 - Check number ranges for tenant 1 have current value 4', async () => {
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'alice' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(4);
        });
    });

    it('12 - Check number ranges for tenant 2 has current value 2', async () => {
        const numberRanges = await test.GET("/odata/v4/number-range-plugin/Ranges", { auth: { username: 'erin' } } );
        expect(numberRanges.data.value.length).to.equal(3);
        [0,1,2].forEach(i => {
            expect(numberRanges.data.value[i].CurrentValue).to.equal(2);
        });
    });

    it('13 - Unsubscribe tenant t1', async () => {
        expect((await test.POST("/-/cds/deployment/unsubscribe", { "tenant": "t1" }, { auth: { username: 'yves' } })).status).to.equal(204);
    });

    it('14 - Unsubscribe tenant t2', async () => {
        expect((await test.POST("/-/cds/deployment/unsubscribe", { "tenant": "t2" }, { auth: { username: 'yves' } })).status).to.equal(204);
    });

    it('15 - Unsubscribe tenant t0 (for cleanup)', async () => {
        expect((await test.POST("/-/cds/deployment/unsubscribe", { "tenant": "t0" }, { auth: { username: 'yves' } })).status).to.equal(204);
    });

});

