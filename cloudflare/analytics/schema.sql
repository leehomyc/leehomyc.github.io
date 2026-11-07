CREATE TABLE IF NOT EXISTS analytics_actors(uid TEXT PRIMARY KEY,first_seen INTEGER NOT NULL,last_seen INTEGER NOT NULL,registered INTEGER NOT NULL DEFAULT 0,registered_seen INTEGER);
CREATE TABLE IF NOT EXISTS analytics_sessions(id TEXT PRIMARY KEY,uid TEXT NOT NULL,first_seen INTEGER NOT NULL,last_seen INTEGER NOT NULL,country TEXT NOT NULL,device TEXT NOT NULL,source TEXT NOT NULL,visible_ms INTEGER NOT NULL DEFAULT 0,play_ms INTEGER NOT NULL DEFAULT 0,playing INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS analytics_sessions_time ON analytics_sessions(first_seen);
CREATE INDEX IF NOT EXISTS analytics_sessions_user ON analytics_sessions(uid,first_seen);
CREATE TABLE IF NOT EXISTS analytics_runs(id TEXT PRIMARY KEY,session_id TEXT NOT NULL,uid TEXT NOT NULL,started INTEGER NOT NULL,updated INTEGER NOT NULL,mode TEXT NOT NULL,cls TEXT NOT NULL,difficulty TEXT NOT NULL,play_ms INTEGER NOT NULL DEFAULT 0,sim_seconds REAL NOT NULL DEFAULT 0,kills INTEGER NOT NULL DEFAULT 0,bosses INTEGER NOT NULL DEFAULT 0,level INTEGER NOT NULL DEFAULT 1,ended INTEGER NOT NULL DEFAULT 0,outcome TEXT NOT NULL DEFAULT 'in_progress');
CREATE INDEX IF NOT EXISTS analytics_runs_time ON analytics_runs(started);
CREATE TABLE IF NOT EXISTS analytics_receipts(id TEXT PRIMARY KEY,created INTEGER NOT NULL);

CREATE INDEX IF NOT EXISTS analytics_sessions_online ON analytics_sessions(last_seen);
CREATE TABLE IF NOT EXISTS analytics_activity(session_id TEXT NOT NULL,day TEXT NOT NULL,uid TEXT NOT NULL,country TEXT NOT NULL,device TEXT NOT NULL,source TEXT NOT NULL,visible_ms INTEGER NOT NULL DEFAULT 0,play_ms INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session_id,day));
CREATE INDEX IF NOT EXISTS analytics_activity_day ON analytics_activity(day,uid);
CREATE TABLE IF NOT EXISTS analytics_registration_snapshot(id INTEGER PRIMARY KEY CHECK(id=1),registered_accounts INTEGER NOT NULL,anonymous_accounts INTEGER NOT NULL,captured INTEGER NOT NULL);
