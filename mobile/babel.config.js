module.exports = function (api) {
  api.cache(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === "test";
  return {
    presets: [
      [
        "babel-preset-expo",
        { jsxImportSource: isTest ? undefined : "nativewind" },
      ],
      ...(isTest ? [] : ["nativewind/babel"]),
    ],
  };
};