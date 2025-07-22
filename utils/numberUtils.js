// const util = require("util");
const _ = require("lodash");
const round = (num) => {
  const data = _.round(num, 6);
  if (isNaN(data)) return 0;
  return data;
};

const SORT_MAP = {
  newest: { createdAt: -1 }, // MongoDB style: newest = sort by createdAt DESC
  price_asc: { price: 1 }, // sort by price ASC
  price_desc: { price: -1 }, // sort by price DESC
  relevant: { relevanceScore: -1 }, // assume you calculate relevance score
};
const FEATURED_AD_SORT_MAP = {
  newest: { "featuredAd.createdAt": -1 }, // MongoDB style: newest = sort by featuredAd.createdAt DESC
  price_asc: { price: 1 }, // sort by featuredAd price ASC
  price_desc: { price: -1 }, // sort by featuredAd price DESC
  relevant: { relevanceScore: -1 }, // assume you calculate relevance score for featured ads
};
module.exports = { round, SORT_MAP, FEATURED_AD_SORT_MAP };
