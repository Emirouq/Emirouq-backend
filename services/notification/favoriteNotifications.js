const Notification = require("../../models/Notification.model");
const SavedSearch = require("../../models/SavedSearch.model");
const User = require("../../models/User.model");
const { notificationService, NotificationEventType } = require("./index");

const buildPostData = (post, extra = {}) => ({
  postId: post.uuid,
  adId: post.uuid,
  adTitle: post.title,
  price: post.price,
  status: post.status,
  ...extra,
});

const emitFavoriteNotification = async (
  userId,
  eventType,
  post,
  extra = {},
) => {
  if (!userId || !eventType || !post?.uuid) {
    return;
  }

  const contextId = extra.contextId || `${post.uuid}:${eventType}`;
  if (extra.dedupe !== false) {
    const alreadyExists = await Notification.exists({
      receiver: userId,
      eventType,
      contextId,
    });
    if (alreadyExists) {
      return;
    }
  }

  await notificationService.emit(
    eventType,
    {
      initiatorId: extra.initiatorId || "system",
      receiverId: userId,
      initiatorRole: extra.initiatorRole || "system",
      receiverRole: "customer",
      contextId,
      contextType: extra.contextType || "favorite",
      data: buildPostData(post, extra.data),
    },
    {
      push: extra.push,
    },
  );
};

const notifyUsersWhoFavoritedPost = async (post, eventType, extra = {}) => {
  const users = await User.find({ favourites: post.uuid }, { uuid: 1 });

  await Promise.all(
    users
      .filter((user) => user.uuid !== post.userId)
      .map((user) =>
        emitFavoriteNotification(user.uuid, eventType, post, extra),
      ),
  );
};

const matchesSavedSearch = (post, criteria = {}) => {
  if (criteria.category && criteria.category !== post.category) {
    return false;
  }
  if (criteria.subCategory && criteria.subCategory !== post.subCategory) {
    return false;
  }
  if (
    criteria.minPrice != null &&
    Number(post.price) < Number(criteria.minPrice)
  ) {
    return false;
  }
  if (
    criteria.maxPrice != null &&
    Number(post.price) > Number(criteria.maxPrice)
  ) {
    return false;
  }
  if (
    criteria.location?.city &&
    post.location?.city &&
    criteria.location.city.toLowerCase() !== post.location.city.toLowerCase()
  ) {
    return false;
  }
  if (
    criteria.location?.country &&
    post.location?.country &&
    criteria.location.country.toLowerCase() !==
      post.location.country.toLowerCase()
  ) {
    return false;
  }
  if (criteria.keyword) {
    const keyword = criteria.keyword.toLowerCase();
    const searchable =
      `${post.title || ""} ${post.description || ""}`.toLowerCase();
    if (!searchable.includes(keyword)) {
      return false;
    }
  }
  return true;
};

const notifySavedSearchMatches = async (post, extra = {}) => {
  if (post.status !== "active") {
    return;
  }

  const savedSearches = await SavedSearch.find({ isActive: true });
  const matchedSearches = savedSearches.filter((savedSearch) =>
    matchesSavedSearch(post, savedSearch.criteria),
  );

  await Promise.all(
    matchedSearches
      .filter((savedSearch) => savedSearch.user !== post.userId)
      .map((savedSearch) =>
        emitFavoriteNotification(
          savedSearch.user,
          NotificationEventType.SAVED_SEARCH_MATCH,
          post,
          {
            ...extra,
            contextId: `${savedSearch.uuid}:${post.uuid}`,
            contextType: "saved_search",
            data: {
              savedSearchId: savedSearch.uuid,
              savedSearchName: savedSearch.name,
            },
          },
        ),
      ),
  );
};

const notifyFavoritePriceDrop = async (post, oldPrice, extra = {}) => {
  if (
    oldPrice == null ||
    post.price == null ||
    Number(post.price) >= Number(oldPrice)
  ) {
    return;
  }

  await notifyUsersWhoFavoritedPost(
    post,
    NotificationEventType.SAVED_ITEM_PRICE_DROPPED,
    {
      ...extra,
      contextId: `${post.uuid}:price_drop:${post.price}`,
      data: {
        oldPrice,
        newPrice: post.price,
      },
    },
  );
};

const notifyFavoriteItemUpdated = async (post, extra = {}) => {
  await notifyUsersWhoFavoritedPost(
    post,
    NotificationEventType.FAVORITE_ITEM_UPDATED,
    {
      ...extra,
      contextId: `${post.uuid}:updated:${Date.now()}`,
      dedupe: false,
    },
  );
};

const notifyFavoriteItemUnavailable = async (post, extra = {}) => {
  await notifyUsersWhoFavoritedPost(
    post,
    NotificationEventType.FAVORITE_ITEM_UNAVAILABLE,
    {
      ...extra,
      contextId: `${post.uuid}:unavailable:${post.status || "deleted"}`,
    },
  );
};

module.exports = {
  notifySavedSearchMatches,
  notifyFavoritePriceDrop,
  notifyFavoriteItemUpdated,
  notifyFavoriteItemUnavailable,
};
