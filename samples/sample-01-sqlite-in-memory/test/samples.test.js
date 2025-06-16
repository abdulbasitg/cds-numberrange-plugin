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

})