const cds = require("@sap/cds/lib")

describe('sample-04-draft', async ()=>{  
  const test = cds.test(__dirname+'/..');
  it('0 - Reset Existing Data on Database.', async () => {    
    const { CatalogService, NumberRangePluginService } = await cds.services;
    const { Books } = CatalogService.entities;
    const { Ranges } = NumberRangePluginService.entities;
    await DELETE.from(Books);
    await DELETE.from(Books.drafts);
    await UPDATE(Ranges).where({ RangeName: 'BOOKID' }).set({CurrentValue: 1});
  });     
  it('1 - Check if Books Entity is Empty', async () => {    
    const booksData = await test.GET('/odata/v4/catalog/Books');
    expect(booksData.data.value.length).to.equal(0);

    const booksDraftData = await test.GET('/odata/v4/catalog/Books?$filter=(IsActiveEntity eq false)');
    expect(booksDraftData.data.value.length).to.equal(0);
  });      
  it('2 - Create a New Book Draft', async () => {    
    const firstBooksData = await test.POST('/odata/v4/catalog/Books',{
      title: 'Test Book',
      stock : 1
    });
    expect(firstBooksData.data.ID).to.equal(1);
  });  
  it('3 - Create a Book Bypassing Draft', async () => {    
    const firstBooksData = await test.POST('/odata/v4/catalog/Books',{
      title: 'Test Book',
      stock : 1,
      'IsActiveEntity': true
    });
    expect(firstBooksData.data.ID).to.equal(2);  
  });  
  it('4 - Create Second Book Draft', async () => {    
    const firstBooksData = await test.POST('/odata/v4/catalog/Books',{
      title: 'Test Book',
      stock : 1
    }); 
    expect(firstBooksData.data.ID).to.equal(3);
  });  
  it('5 - Check Data in Books and Draft Tables', async () => {    
    const booksData = await test.GET('/odata/v4/catalog/Books');
    expect(booksData.data.value.length).to.equal(1);

    const booksDraftData = await test.GET('/odata/v4/catalog/Books?$filter=(IsActiveEntity eq false)');
    expect(booksDraftData.data.value.length).to.equal(2);
  });  
  it('6 - Activate Previously Created First Draft', async () => {    
    await test.POST('/odata/v4/catalog/Books(ID=1,IsActiveEntity=false)/draftActivate');
    const booksData = await test.GET('/odata/v4/catalog/Books');
    expect(booksData.data.value.length).to.equal(2);

    const booksDraftData = await test.GET('/odata/v4/catalog/Books?$filter=(IsActiveEntity eq false)');
    expect(booksDraftData.data.value.length).to.equal(1);

  });  
  it('6 - Activate Previously Created Second Draft', async () => {    
    await test.POST('/odata/v4/catalog/Books(ID=3,IsActiveEntity=false)/draftActivate');
    const booksData = await test.GET('/odata/v4/catalog/Books');
    expect(booksData.data.value.length).to.equal(3);

    const booksDraftData = await test.GET('/odata/v4/catalog/Books?$filter=(IsActiveEntity eq false)');
    expect(booksDraftData.data.value.length).to.equal(0);

  });  
})