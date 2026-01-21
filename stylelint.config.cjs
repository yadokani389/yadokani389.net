module.exports = {
  extends: ["stylelint-config-recommended", "stylelint-config-html"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "tailwind",
          "apply",
          "layer",
          "variants",
          "responsive",
          "screen",
          "theme",
          "plugin",
          "source",
          "utility",
          "variant",
          "custom-variant",
          "reference",
          "config",
        ],
      },
    ],
    "no-descending-specificity": null,
  },
};
