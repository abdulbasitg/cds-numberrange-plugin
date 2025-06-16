using my.bookshop as my from '../db/schema';

service CatalogService {
    @odata.draft.enabled
    @odata.draft.bypass
    entity Books as projection on my.Books;
}
