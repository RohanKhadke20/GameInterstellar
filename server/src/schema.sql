-- ============================================================================
-- ASTROLITH: Space Mining Tick Engine Database Schema
-- Target Engine: SQLite 3.37+ (WAL Mode, STRICT typing, Foreign Key Enforcement)
-- ============================================================================

-- 1. Performance & Integrity PRAGMAs
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000; -- 64MB memory cache

-- ============================================================================
-- 2. Table Definitions
-- ============================================================================

-- Users Table
-- Stores core player progression and high-precision epoch timestamps for offline tick calculations
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credits INTEGER NOT NULL DEFAULT 1000 CHECK (credits >= 0),
    last_tick_timestamp INTEGER NOT NULL DEFAULT (unixepoch()) CHECK (last_tick_timestamp > 0)
) STRICT;

-- Sectors Table
-- Represents spatial hex/grid sectors with axial coordinates (q, r), yield modifiers, and environmental hazards
CREATE TABLE IF NOT EXISTS Sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coordinate_q INTEGER NOT NULL,
    coordinate_r INTEGER NOT NULL,
    resource_yield_multiplier REAL NOT NULL DEFAULT 1.0 CHECK (resource_yield_multiplier >= 0.0),
    hazard_level REAL NOT NULL DEFAULT 0.0 CHECK (hazard_level >= 0.0 AND hazard_level <= 1.0),
    CONSTRAINT unq_sector_coordinates UNIQUE (coordinate_q, coordinate_r)
) STRICT;

-- Fleet Table
-- Represents mining and exploration vessels assigned to sectors with modular component outfitting
CREATE TABLE IF NOT EXISTS Fleet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Vessel-Alpha',
    hull_class TEXT NOT NULL DEFAULT 'Class-II Mining Rig',
    sector_id INTEGER,
    base_extraction_rate REAL NOT NULL DEFAULT 2.0 CHECK (base_extraction_rate >= 0.0),
    extraction_rate REAL NOT NULL DEFAULT 2.0 CHECK (extraction_rate >= 0.0),
    transit_speed REAL NOT NULL DEFAULT 1.0 CHECK (transit_speed > 0.0),
    cargo_capacity REAL NOT NULL DEFAULT 10000.0 CHECK (cargo_capacity > 0.0),
    max_power INTEGER NOT NULL DEFAULT 100 CHECK (max_power > 0),
    max_tonnage INTEGER NOT NULL DEFAULT 50 CHECK (max_tonnage > 0),
    modules TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'mining', 'transit')),
    CONSTRAINT fk_fleet_user FOREIGN KEY (user_id) 
        REFERENCES Users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_fleet_sector FOREIGN KEY (sector_id) 
        REFERENCES Sectors (id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
) STRICT;

-- Inventory Table
-- Composite-keyed ledger for user resource stockpiles
CREATE TABLE IF NOT EXISTS Inventory (
    user_id INTEGER NOT NULL,
    resource_id TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0.0 CHECK (quantity >= 0.0),
    PRIMARY KEY (user_id, resource_id),
    CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) 
        REFERENCES Users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) STRICT;

-- Upgrades Table
-- Tracks technological research progression levels per user
CREATE TABLE IF NOT EXISTS Upgrades (
    user_id INTEGER NOT NULL,
    upgrade_id TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    PRIMARY KEY (user_id, upgrade_id),
    CONSTRAINT fk_upgrades_user FOREIGN KEY (user_id) 
        REFERENCES Users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) STRICT;

-- Market Table
-- Dynamic commodity exchange pricing, supply velocity, and price trend history
CREATE TABLE IF NOT EXISTS Market (
    resource_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_price REAL NOT NULL CHECK (base_price > 0),
    current_price REAL NOT NULL CHECK (current_price > 0),
    previous_price REAL NOT NULL CHECK (previous_price > 0),
    trend REAL NOT NULL DEFAULT 0.0,
    volume_sold REAL NOT NULL DEFAULT 0.0 CHECK (volume_sold >= 0),
    last_updated INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Alliances Table
CREATE TABLE IF NOT EXISTS Alliances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

-- Megastructure Projects Table
CREATE TABLE IF NOT EXISTS MegastructureProjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alliance_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1),
    description TEXT NOT NULL DEFAULT '',
    required_alloys REAL NOT NULL DEFAULT 1000.0 CHECK (required_alloys > 0),
    contributed_alloys REAL NOT NULL DEFAULT 0.0 CHECK (contributed_alloys >= 0),
    required_fuel REAL NOT NULL DEFAULT 500.0 CHECK (required_fuel > 0),
    contributed_fuel REAL NOT NULL DEFAULT 0.0 CHECK (contributed_fuel >= 0),
    perk_description TEXT NOT NULL DEFAULT '+25% Global Yield & -30% Transit Duration',
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at INTEGER,
    CONSTRAINT fk_project_alliance FOREIGN KEY (alliance_id) 
        REFERENCES Alliances (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) STRICT;

-- Megastructure Contributions Table
CREATE TABLE IF NOT EXISTS MegastructureContributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    resource_id TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    contributed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    CONSTRAINT fk_contrib_project FOREIGN KEY (project_id) 
        REFERENCES MegastructureProjects (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_contrib_user FOREIGN KEY (user_id) 
        REFERENCES Users (id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) STRICT;

-- ============================================================================
-- 3. Query Optimization Indexes
-- ============================================================================

-- Fast lookup for user-owned fleets
CREATE INDEX IF NOT EXISTS idx_fleet_user_id 
    ON Fleet (user_id);

-- Fast lookup for fleet deployments in specific sectors
CREATE INDEX IF NOT EXISTS idx_fleet_sector_id 
    ON Fleet (sector_id);

-- Composite index optimized for the core game loop (extracting all active mining fleets per user)
CREATE INDEX IF NOT EXISTS idx_fleet_user_status_sector 
    ON Fleet (user_id, status, sector_id);

-- Fast lookup for player inventory summaries
CREATE INDEX IF NOT EXISTS idx_inventory_user_id 
    ON Inventory (user_id);

-- Fast lookup for user technological upgrades
CREATE INDEX IF NOT EXISTS idx_upgrades_user_id 
    ON Upgrades (user_id);

-- Fast lookup for sector lookups by 2D axial coordinates
CREATE INDEX IF NOT EXISTS idx_sectors_coords 
    ON Sectors (coordinate_q, coordinate_r);

-- Fast lookup for Megastructure projects and user contributions
CREATE INDEX IF NOT EXISTS idx_megastructure_alliance 
    ON MegastructureProjects (alliance_id);

CREATE INDEX IF NOT EXISTS idx_contributions_project 
    ON MegastructureContributions (project_id);

CREATE INDEX IF NOT EXISTS idx_contributions_user 
    ON MegastructureContributions (user_id);
