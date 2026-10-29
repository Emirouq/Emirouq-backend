/**
 * One-off repair: converts Post.expirationDate values saved in milliseconds to
 * Unix seconds.
 *
 * Until the fix in middlewares/access_checker.js, paid ads got a Date stamped
 * into the Number field `expirationDate`, which Mongoose stored as
 * milliseconds. The expiry scanner compares against seconds, so those ads
 * never expired.
 *
 * Anything above 100,000,000,000 is milliseconds: as seconds it would be a
 * date in the year 5138.
 *
 * Usage (from the backend folder):
 *   node scripts/fixPostExpirationUnits.js           # dry run, changes nothing
 *   node scripts/fixPostExpirationUnits.js --apply   # writes the fix
 *
 * After --apply, the next ad lifecycle scan expires every paid ad whose date
 * has already passed and sends each owner an "ad expired" notification.
 */
const mongoose = require("mongoose");
const { dbUrl } = require("../config/keys").host;
const Post = require("../models/Post.model");

const MS_THRESHOLD = 100000000000;
const apply = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(dbUrl);

  const filter = { expirationDate: { $gt: MS_THRESHOLD } };
  const now = Math.floor(Date.now() / 1000);

  const posts = await Post.find(filter)
    .select("uuid expirationDate status isExpired")
    .lean();
  const alreadyPast = posts.filter(
    (post) => Math.floor(post.expirationDate / 1000) <= now
  );
  const willExpire = alreadyPast.filter(
    (post) =>
      !post.isExpired &&
      !["expired", "draft", "rejected", "removed"].includes(post.status)
  );

  console.log(`Posts with expirationDate in milliseconds: ${posts.length}`);
  console.log(`  of which the date has already passed:    ${alreadyPast.length}`);
  console.log(`  of which the next scan will expire:      ${willExpire.length}`);

  if (!apply) {
    console.log("\nDry run. Nothing changed. Run again with --apply to fix.");
    return;
  }

  // Pipeline update: divide in place, rounding down to whole seconds.
  const result = await Post.updateMany(filter, [
    {
      $set: {
        expirationDate: {
          $floor: { $divide: ["$expirationDate", 1000] },
        },
      },
    },
  ]);

  console.log(`\nUpdated ${result.modifiedCount} posts.`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
