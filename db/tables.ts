export const gameSettings = `CREATE TABLE IF NOT EXISTS game_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    settings JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

export const lobby = `CREATE TABLE IF NOT EXISTS lobbies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    round_id BIGINT NOT NULL,
    result JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

export const betResult = `create table if not exists bet_results (
    id int auto_increment primary key,
    user_id varchar(50),
    round_id varchar(100),
    operator_id varchar(50),
    bet_amt float,
    bet_values json,
    created_at timestamp default current_timestamp
);`

export const settlement = `create table if not exists settlements (
    id int auto_increment primary key,
    user_id varchar(50),
    round_id varchar(100),
    operator_id varchar(50),
    bet_amt float,
    win_amt float,
    bet_values json,
    settled_bets json,
    round_result json,
    status enum("WIN", "LOSS"),
    created_at timestamp default current_timestamp
);`