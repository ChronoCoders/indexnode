-- Drops the distributed-worker tables. The Rust modules that owned these tables
-- (core::distributed and the standalone worker crate) were removed; the
-- embedded worker in api/ uses the `jobs` table created by 001_initial_schema.
-- Nothing has written to worker_nodes or distributed_jobs in production code,
-- so the data is empty.

DROP TABLE IF EXISTS distributed_jobs CASCADE;
DROP TABLE IF EXISTS worker_nodes CASCADE;
