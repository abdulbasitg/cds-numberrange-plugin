namespace my.bookshop;

entity Books {
  key bookid : Integer @plugin.numberrange.rangeid: 'BOOKID';
  bookidpad : String(10) @plugin.numberrange.rangeid: 'BOOKIDPAD';
  bookidchar : String(10) @plugin.numberrange.rangeid: 'BOOKIDCHAR';
  author: Association to Authors;
  title  : String (111);
  stock  : Integer;
}

entity Authors {
  key authorid : Integer @plugin.numberrange.rangeid: 'AUTHORID';
  name  : String(111);
  books : Association to many Books on books.author = $self;
}


