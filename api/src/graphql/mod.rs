pub mod schema;
pub mod types;

use indexnode_core::{CreditManager, MarketplaceClient};
pub use schema::AppSchema;
use sqlx::PgPool;

pub fn build_schema(
    pool: PgPool,
    credit_manager: CreditManager,
    marketplace: MarketplaceClient,
) -> AppSchema {
    schema::build_schema(pool, credit_manager, marketplace)
}
