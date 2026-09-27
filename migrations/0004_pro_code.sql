-- Links a PRO access code to the account so PRO is restored when the user
-- signs in on another device (the Worker still limits each code to 3
-- devices). Nullable: most accounts are free.
ALTER TABLE users ADD COLUMN pro_code TEXT;
