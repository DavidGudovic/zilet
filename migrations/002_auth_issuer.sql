ALTER TABLE account ADD COLUMN issuer text;
UPDATE account SET issuer=provider_id WHERE issuer IS NULL;
ALTER TABLE account ALTER COLUMN issuer SET NOT NULL;
CREATE UNIQUE INDEX account_issuer_account_idx ON account(issuer,account_id);
CREATE INDEX account_user_idx ON account(user_id);
