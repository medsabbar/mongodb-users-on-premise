## Backfilling temporary user metadata into `system.users`

If you already created temporary users before the `customData.isTemporary` and
`customData.tempExpiresAt` fields were introduced, you can backfill them from
the existing `admin.tempUsers` collection using `mongosh`.

> **Warning:** Review and adapt the script before running it in production.
> Make sure you target the correct database (`admin`) and that a TTL index on
> `customData.tempExpiresAt` is configured as described in the main README.

From a `mongosh` shell connected to your deployment:

```js
use admin

db.tempUsers.find({ status: "active" }).forEach(function(t) {
  db.system.users.updateOne(
    { user: t.username, db: "admin" },
    {
      $set: {
        "customData.isTemporary": true,
        "customData.tempExpiresAt": t.expiresAt
      }
    }
  );
});
```

After running this script:

- Existing temporary users will have the same metadata shape as newly created
  ones.
- The TTL index on `system.users.customData.tempExpiresAt` can delete them
  automatically when they expire.

