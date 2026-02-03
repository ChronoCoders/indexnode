-- IndexNode Database Setup
-- Run this script in pgAdmin Query Tool

-- Step 1: Create user
CREATE USER indexnode_user WITH PASSWORD 'IndexNode_Pass_2026!';

-- Step 2: Create database
CREATE DATABASE indexnode OWNER indexnode_user;

-- Step 3: Grant privileges
GRANT ALL PRIVILEGES ON DATABASE indexnode TO indexnode_user;

-- Step 4: Connect to indexnode database
-- In pgAdmin: Close this query window, select 'indexnode' database from dropdown, open new Query Tool
-- Then run the commands below:

GRANT ALL ON SCHEMA public TO indexnode_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO indexnode_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO indexnode_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO indexnode_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO indexnode_user;

-- Done! User 'indexnode_user' can now access the 'indexnode' database
