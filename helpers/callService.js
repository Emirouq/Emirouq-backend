const axios = require("axios");
const queryString = require("qs");
const { resolve } = require("srv-discovery");

const srvDnsLookup = async (route) => {
  try {
    const resolvedUrl = await resolve(route);
    return resolvedUrl;
  } catch (error) {
    return route;
  }
};

const serviceMap = require("../config/keys").serviceMap;

const makeUrl = async (
  { uri = "", pathParams, query, version },
  serviceName
) => {
  const resolvedServiceName = await srvDnsLookup(serviceMap[serviceName]);
  let protocol = "http";
  if (serviceName.includes("webSocket")) protocol = "https";
  return `${protocol}://${resolvedServiceName}/${version || ""}${uri
    .split("/")
    .map((param) =>
      param.charAt(0) === ":" ? encodeURI(pathParams[param.slice(1)]) : param
    )
    .join("/")}${query ? `?${queryString.stringify(query)}` : ""}`;
};

const callService = ({
  uriEndPoint = { uri: "", method: "GET", version: "", headerProps: {} },
  serviceName,
  pathParams,
  query,
  body,
}) => {
  return new Promise((resolve, reject) => {
    makeUrl({ ...uriEndPoint, pathParams, query }, serviceName)
      .then((resolvedUrl) => {
        axios({
          method: uriEndPoint.method || "POST",
          url: resolvedUrl,
          headers: {
            ...uriEndPoint.headerProps,
            // ...getDefaultHeaders(),
          },
          data: body || undefined,
        })
          .then((response) => {
            resolve(response.data);
          })
          .catch((err) => {
            console.error(
              "error in axios call: ",
              err,
              err?.message,
              err?.response
            );
            reject(err);
          });
      })
      .catch((err) => {
        console.error(err);
      });
  });
};

module.exports = callService;
