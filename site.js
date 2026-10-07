const SITE = {
  name: "raufsemi",
  title: "raufsemi",
  description: "an ephemeral being",

  bio: "learning",
  footer: "@raufsemi",

  image: "blogs/images/me.jpg",
  imageAlt: "Raufsemi",

  github: "https://github.com/raufsemi",
  email: "mailto:raufisemi@gmail.com",
};

document.querySelectorAll("[data-site]").forEach((element) => {
  const key = element.dataset.site;
  const value = SITE[key];

  if (!value) return;

  if (element.hasAttribute("content")) {
    element.setAttribute("content", value);
  } else {
    element.textContent = value;
  }
});

document.querySelectorAll("[data-site-src]").forEach((element) => {
  const key = element.dataset.siteSrc;
  const value = SITE[key];

  if (value) {
    element.src = value;
  }
});

document.querySelectorAll("[data-site-alt]").forEach((element) => {
  const key = element.dataset.siteAlt;
  const value = SITE[key];

  if (value) {
    element.alt = value;
  }
});

document.querySelectorAll("[data-site-link]").forEach((element) => {
  const key = element.dataset.siteLink;
  const value = SITE[key];

  if (value) {
    element.href = value;
  }
});
