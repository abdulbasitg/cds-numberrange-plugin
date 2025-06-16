namespace my.bookshop;
entity Books {
  key bookid : Integer @plugin.numberrange.rangeid: 'BOOKID';
  bookidpad : String(10) @plugin.numberrange.rangeid: 'BOOKIDPAD';
  bookidchar : String(10) @plugin.numberrange.rangeid: 'BOOKIDCHAR';
  title  : String (111);
  stock  : Integer;
}