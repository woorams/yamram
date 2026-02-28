-- Seed data for 람얌이의 가계부

-- Expense categories (지출)
INSERT INTO categories (name, type, sort_order) VALUES
  ('생활비', '지출', 1),
  ('식비', '지출', 2),
  ('교통비', '지출', 3),
  ('주거비', '지출', 4),
  ('대출 상환', '지출', 5),
  ('경조사비', '지출', 6),
  ('양가 부모님', '지출', 7),
  ('의료/건강', '지출', 8),
  ('쇼핑/의류', '지출', 9),
  ('문화/여가', '지출', 10),
  ('보험', '지출', 11),
  ('통신비', '지출', 12),
  ('구독료', '지출', 13),
  ('기타', '지출', 14);

-- Income categories (수입)
INSERT INTO categories (name, type, sort_order) VALUES
  ('급여 (우람)', '수입', 1),
  ('급여 (윤미)', '수입', 2),
  ('부수입', '수입', 3),
  ('기타 수입', '수입', 4);

-- Default accounts
INSERT INTO accounts (name, balance, sort_order) VALUES
  ('우람 급여 통장', 0, 1),
  ('윤미 급여 통장', 0, 2),
  ('우람 용돈 통장', 0, 3),
  ('윤미 용돈 통장', 0, 4),
  ('공동 생활비 통장', 0, 5);
