import Database from "better-sqlite3";

const db = new Database("qa-central.sqlite");

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    host_id TEXT NOT NULL,

    game_name TEXT NOT NULL,
    game_link TEXT NOT NULL,

    test_type TEXT NOT NULL,

    max_testers INTEGER NOT NULL,
    reward TEXT,

    description TEXT NOT NULL,

    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'upcoming',

    channel_id TEXT,
    message_id TEXT,

    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS testers (
    test_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,

    PRIMARY KEY (test_id, user_id)
);
`);

export function createTest(data) {
    const result = db.prepare(`
        INSERT INTO tests (
            guild_id,
            host_id,
            game_name,
            game_link,
            test_type,
            max_testers,
            reward,
            description,
            start_time,
            end_time,
            created_at
        )

        VALUES (
            @guild_id,
            @host_id,
            @game_name,
            @game_link,
            @test_type,
            @max_testers,
            @reward,
            @description,
            @start_time,
            @end_time,
            @created_at
        )
    `).run(data);

    return Number(result.lastInsertRowid);
}

export function getTest(id) {
    return db
        .prepare("SELECT * FROM tests WHERE id = ?")
        .get(id);
}

export function setTestMessage(id, channelId, messageId) {
    db.prepare(`
        UPDATE tests
        SET channel_id = ?, message_id = ?
        WHERE id = ?
    `).run(channelId, messageId, id);
}

export function getJoinedCount(testId) {
    const result = db.prepare(`
        SELECT COUNT(*) AS count
        FROM testers
        WHERE test_id = ?
    `).get(testId);

    return result.count;
}

export function joinTest(testId, userId) {

    const test = getTest(testId);

    if (!test) {
        return {
            ok: false,
            reason: "not_found"
        };
    }

    if (test.status === "closed") {
        return {
            ok: false,
            reason: "closed"
        };
    }

    const alreadyJoined = db.prepare(`
        SELECT 1
        FROM testers
        WHERE test_id = ?
        AND user_id = ?
    `).get(testId, userId);

    if (alreadyJoined) {
        return {
            ok: false,
            reason: "already_joined"
        };
    }

    const joined = getJoinedCount(testId);

    if (joined >= test.max_testers) {
        return {
            ok: false,
            reason: "full"
        };
    }

    db.prepare(`
        INSERT INTO testers (
            test_id,
            user_id,
            joined_at
        )

        VALUES (?, ?, ?)
    `).run(
        testId,
        userId,
        new Date().toISOString()
    );

    return {
        ok: true
    };
}

export function listTesters(testId) {
    return db.prepare(`
        SELECT user_id
        FROM testers
        WHERE test_id = ?
        ORDER BY joined_at ASC
    `).all(testId);
}

export function closeTest(testId) {
    db.prepare(`
        UPDATE tests
        SET status = 'closed'
        WHERE id = ?
    `).run(testId);
}
