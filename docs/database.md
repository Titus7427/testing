# Database plan

The production database is PostgreSQL. The domain model is designed around users, roles, provider verification, marketplace listings, service requests, bookings, payments, reviews, disputes, and admin audit logs.

## Planned major tables
- users
- roles
- user_roles
- provider_profiles
- provider_verifications
- service_categories
- services
- provider_services
- service_requests
- bookings
- payments
- messages
- notifications
- reviews
- disputes
- audit_logs

## Constraints
- Use foreign keys and indexes on high-traffic query paths
- Record created and updated timestamps
- Log status transitions for business-critical entities
- Use migrations for all schema changes
