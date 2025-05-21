CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT UNIQUE NOT NULL,
  client_secret TEXT NOT NULL,
  representativeID TEXT NOT NULL
);

INSERT INTO clients (client_id, client_secret, representativeID) VALUES
('meuClientID123', 'meuClientSecret456', 'rep789');