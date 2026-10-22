alter table memocious.products add column message_limit int not null default 500 check(message_limit between 0 and 500);
alter table memocious.categories add column version int not null default 1;
alter table memocious.occasions add column version int not null default 1;
