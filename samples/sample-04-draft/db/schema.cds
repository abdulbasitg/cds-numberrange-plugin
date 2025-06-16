namespace my.bookshop;

entity Books {
  key ID : Integer @plugin.numberrange.rangeid: 'BOOKID';
  authorid : Integer @plugin.numberrange.rangeid: 'AUTHORID';
  title  : String;
  stock  : Integer;
}
