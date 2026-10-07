/* =========================================================================
   Journal — script.js
   Shared by index.html (the post list) and post.html (a single post).

   Posts are markdown files in blogs/:

       blogs/my-first-post.md   ->   post.html?p=my-first-post

   The file name is the slug. Front matter at the top of the file is optional:

       ---
       title: My first post
       date: 2026-09-14
       tags: [writing, notes]
       ---

   Without `title:` the first "# Heading" is used, and failing that the file
   name. Without `date:` the post sorts to the end of the list.
   ========================================================================= */

/* ------------------------------------------------------------- settings -- */
const BLOG_DIR = "blogs/";
const MANIFEST = BLOG_DIR + "index.json"; // used when the folder cannot be listed
const POSTS_PER_PAGE = 10;

/* --------------------------------------------------------------- theme -- */
const switcher = document.getElementById("mode-switcher");

function syncSwitcher(theme) {
  if (!switcher) return;
  const isDark = theme === "dark";
  switcher.classList.toggle("active", isDark);
  switcher.setAttribute("aria-pressed", String(isDark));
  switcher.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme",
  );
}

if (switcher) {
  switcher.addEventListener("click", function () {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    syncSwitcher(next);
  });
}

syncSwitcher(document.documentElement.getAttribute("data-theme"));

/* ------------------------------------------------------------- helpers -- */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Escapes a value that is already HTML-escaped and is about to go in an attribute. */
function attr(value) {
  return String(value).replace(/"/g, "&quot;");
}

/* 2026-09-14 -> 14.09.2026 */
function formatDate(value) {
  const parts = String(value || "")
    .slice(0, 10)
    .split("-");
  if (parts.length !== 3) return "";
  return parts[2] + "." + parts[1] + "." + parts[0];
}

/* blogs/my-post.md -> my-post */
function slugFromFile(file) {
  return String(file).split("/").pop().replace(/\.md$/i, "");
}

/* my-post -> My Post */
function humanize(slug) {
  return String(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
}

/* "tags: [writing, notes]" / "tags: writing, notes" -> ['writing', 'notes'] */
function parseTags(value) {
  if (!value) return [];
  return String(value)
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map(function (tag) {
      return tag.trim().replace(/^["']|["']$/g, "");
    })
    .filter(Boolean);
}

/* Makes relative paths inside a post relative to blogs/. */
function resolveAsset(src, base) {
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src)) return src;
  if (/^(?:data|mailto|tel):/i.test(src)) return src;
  if (src.charAt(0) === "/" || src.charAt(0) === "#") return src;
  return base + src.replace(/^\.\//, "");
}

/* A link to another .md file becomes a link to that post's page. */
function resolveLink(href, base) {
  if (/\.md$/i.test(href) && !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href)) {
    return "post.html?p=" + encodeURIComponent(slugFromFile(href));
  }
  return resolveAsset(href, base);
}

function siteName() {
  const el = document.querySelector(".site-title");
  return el ? el.textContent.trim() : document.title;
}

/* -------------------------------------------------------- front matter -- */
/* Splits the "--- ... ---" block from the markdown body. */
function parseFrontMatter(raw) {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n?/.exec(text);

  if (!match) return { data: {}, body: text };

  const data = {};
  match[1].split("\n").forEach(function (line) {
    const colon = line.indexOf(":");
    if (colon === -1) return;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) data[key] = value;
  });

  return { data: data, body: text.slice(match[0].length) };
}

/* ------------------------------------------------------------ markdown -- */
/* Inline markdown: code spans, images, links, bold, italic, strikethrough. */
function renderInline(text, base) {
  const code = [];

  /* Pull code spans out first so nothing inside them is reformatted. */
  text = String(text).replace(/`([^`]+)`/g, function (_, inner) {
    code.push(inner);
    return "\u0000" + (code.length - 1) + "\u0000";
  });

  let out = escapeHtml(text);

  /* ![alt](src "title") */
  out = out.replace(
    /!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)/g,
    function (_, alt, src, title) {
      return (
        '<img src="' +
        attr(resolveAsset(src, base)) +
        '" alt="' +
        attr(alt) +
        '"' +
        (title ? ' title="' + attr(title) + '"' : "") +
        ">"
      );
    },
  );

  /* [text](href "title") */
  out = out.replace(
    /\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)/g,
    function (_, label, href, title) {
      const url = resolveLink(href, base);
      const external = /^https?:\/\//i.test(url);
      return (
        '<a href="' +
        attr(url) +
        '"' +
        (title ? ' title="' + attr(title) + '"' : "") +
        (external ? ' target="_blank" rel="noopener"' : "") +
        ">" +
        label +
        "</a>"
      );
    },
  );

  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:!?)]|$)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");

  /* Put the code spans back. */
  return out.replace(/\u0000(\d+)\u0000/g, function (_, index) {
    return "<code>" + escapeHtml(code[Number(index)]) + "</code>";
  });
}

/* Wraps a run of lines in <p>, honouring "two spaces at end of line" as <br>. */
function renderParagraph(lines, base) {
  const text = renderInline(lines.join("\n"), base)
    .replace(/ {2,}\n/g, "<br>")
    .replace(/\n/g, " ")
    .trim();
  return "<p>" + text + "</p>";
}

function isBlockStart(line) {
  return (
    /^```/.test(line) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*(?:[-*+]|\d+[.)])\s+/.test(line) ||
    /^\s*</.test(line)
  );
}

/* Block markdown: headings, lists, quotes, code fences, rules, raw HTML. */
function renderMarkdown(markdown, base) {
  const lines = String(markdown).replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    /* ``` fenced code */
    const fence = /^```\s*([\w+#.-]*)\s*$/.exec(line);
    if (fence) {
      const language = fence[1];
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(
        "<pre><code" +
          (language ? ' class="language-' + attr(language) + '"' : "") +
          ">" +
          escapeHtml(body.join("\n").replace(/\n+$/, "")) +
          "</code></pre>",
      );
      continue;
    }

    /* --- horizontal rule */
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    /* # heading — shifted down one level, the post title is the <h1> */
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      out.push(
        "<h" +
          level +
          ">" +
          renderInline(heading[2], base) +
          "</h" +
          level +
          ">",
      );
      i++;
      continue;
    }

    /* > blockquote */
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + renderParagraph(body, base) + "</blockquote>");
      continue;
    }

    /* - list  /  1. list  (one level, indented lines continue the item) */
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];

      while (i < lines.length && /^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "");
        i++;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^\s*(?:[-*+]|\d+[.)])\s+/.test(lines[i]) &&
          /^\s{2,}/.test(lines[i])
        ) {
          item += " " + lines[i].trim();
          i++;
        }
        items.push("<li>" + renderInline(item, base) + "</li>");
      }

      const tag = ordered ? "ol" : "ul";
      out.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
      continue;
    }

    /* Raw HTML block — handy for <figure>, <table>, embeds … */
    if (/^\s*</.test(line)) {
      const body = [];
      while (i < lines.length && lines[i].trim()) {
        body.push(lines[i]);
        i++;
      }
      out.push(body.join("\n"));
      continue;
    }

    /* paragraph */
    const body = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      body.push(lines[i]);
      i++;
    }
    if (body.length) out.push(renderParagraph(body, base));
  }

  return out.join("\n");
}

/* ----------------------------------------------------------- blog data -- */
let postsPromise = null;

function loadPosts() {
  if (!postsPromise) postsPromise = loadPostsOnce();
  return postsPromise;
}

async function loadPostsOnce() {
  const files = await listPostFiles();
  if (!files) return null;

  const posts = await Promise.all(files.map(fetchPost));
  return posts.filter(Boolean).sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
}

/* How the folder is read:
   1. the directory listing itself (python -m http.server, Live Server, serve …)
   2. blogs/index.json (GitHub Pages and friends; run tools/build-index.sh) */
async function listPostFiles() {
  try {
    const response = await fetch(BLOG_DIR, { cache: "no-store" });
    if (response.ok) {
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const files = Array.prototype.slice
        .call(doc.querySelectorAll("a[href]"))
        .map(function (link) {
          return decodeURIComponent(
            link.getAttribute("href").split("?")[0].split("#")[0],
          );
        })
        .filter(function (href) {
          return /\.md$/i.test(href) && !/\/?index\.md$/i.test(href);
        })
        .map(function (href) {
          return href.split("/").pop();
        });

      const unique = files.filter(function (file, index) {
        return files.indexOf(file) === index;
      });
      if (unique.length) return unique;
    }
  } catch (e) {
    /* fall through to the manifest */
  }

  try {
    const response = await fetch(MANIFEST, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.posts || [];
      return list
        .map(function (entry) {
          return typeof entry === "string" ? entry : entry.file;
        })
        .filter(Boolean);
    }
  } catch (e) {
    /* nothing left to try */
  }

  return null;
}

async function fetchPost(file) {
  try {
    const response = await fetch(BLOG_DIR + file, { cache: "no-store" });
    if (!response.ok) return null;
    return buildPost(file, await response.text());
  } catch (e) {
    return null;
  }
}

function buildPost(file, raw) {
  const slug = slugFromFile(file);
  const parsed = parseFrontMatter(raw);
  const body = parsed.body.trim();
  const data = parsed.data;
  const heading = /^#\s+(.+)$/m.exec(body);

  return {
    slug: data.slug || slug,
    title: data.title || (heading ? heading[1].trim() : humanize(slug)),
    date: data.date || "",
    tags: parseTags(data.tags),
    markdown: body,
  };
}

/* -------------------------------------------------------- shared pieces -- */
const ICONS = {
  twitter:
    '<svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>',
  facebook:
    '<svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  link: '<svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

function postUrl(slug) {
  return new URL(
    "post.html?p=" + encodeURIComponent(slug),
    window.location.href,
  ).href;
}

function shareMarkup(post) {
  const url = encodeURIComponent(postUrl(post.slug));
  const title = encodeURIComponent(post.title);

  return [
    '<div class="post-share">',
    "<span>Share:</span>",
    '<a href="https://twitter.com/intent/tweet?text=' +
      title +
      "&amp;url=" +
      url +
      '" target="_blank" rel="noopener" aria-label="Share on Twitter">' +
      ICONS.twitter +
      "</a>",
    '<a href="https://www.facebook.com/sharer/sharer.php?u=' +
      url +
      '" target="_blank" rel="noopener" aria-label="Share on Facebook">' +
      ICONS.facebook +
      "</a>",
    '<button type="button" class="copy-link" data-url="' +
      attr(postUrl(post.slug)) +
      '" aria-label="Copy link">' +
      ICONS.link +
      "</button>",
    "</div>",
  ].join("");
}

function tagsMarkup(post) {
  if (!post.tags.length) return "";
  const tags = post.tags.map(function (tag) {
    return (
      '<a class="post-tag" href="index.html?tag=' +
      encodeURIComponent(tag.toLowerCase()) +
      '">' +
      escapeHtml(tag) +
      "</a>"
    );
  });
  return '<div class="tags-container">' + tags.join("") + "</div>";
}

function emptyNotice() {
  return (
    '<p class="notice">Could not read the posts in <code>' +
    BLOG_DIR +
    "</code>.<br>" +
    "Locally, serve the folder over HTTP (<code>python3 -m http.server</code>) and open " +
    "<code>http://localhost:8000</code>.<br>" +
    "On a static host, run <code>tools/build-index.sh</code> and commit " +
    "<code>" +
    MANIFEST +
    "</code>.</p>"
  );
}

/* -------------------------------------------------------- index page ---- */
function listItemMarkup(post) {
  return (
    '<div class="post-list">' +
    '<a class="post-title" href="post.html?p=' +
    encodeURIComponent(post.slug) +
    '">' +
    escapeHtml(post.title) +
    "</a>" +
    (post.date
      ? '<time class="post-date" datetime="' +
        attr(post.date) +
        '">' +
        formatDate(post.date) +
        "</time>"
      : "") +
    "</div>"
  );
}

function pageLink(page, tag) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? "index.html?" + query : "index.html";
}

function paginationMarkup(current, pages, tag) {
  const parts = [];

  if (current > 1) {
    parts.push(
      '<a class="prev" href="' +
        attr(pageLink(current - 1, tag)) +
        '">&lt; Previous</a>',
    );
  }
  parts.push(
    '<span class="page-number">Page ' + current + " of " + pages + "</span>",
  );
  if (current < pages) {
    parts.push(
      '<a class="next" href="' +
        attr(pageLink(current + 1, tag)) +
        '">Next &gt;</a>',
    );
  }

  return parts.join("");
}

async function renderIndexPage() {
  const container = document.getElementById("post-list");
  const pagination = document.getElementById("pagination");
  const filterNote = document.getElementById("filter-note");
  if (!container) return;

  const posts = await loadPosts();

  if (!posts) {
    container.innerHTML = emptyNotice();
    return;
  }
  if (!posts.length) {
    container.innerHTML =
      '<p class="notice">No posts yet. Add a markdown file to <code>' +
      BLOG_DIR +
      "</code>.</p>";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const tag = (params.get("tag") || "").trim().toLowerCase();
  const visible = tag
    ? posts.filter(function (post) {
        return post.tags.some(function (candidate) {
          return candidate.toLowerCase() === tag;
        });
      })
    : posts;

  if (filterNote) {
    filterNote.hidden = !tag;
    if (tag) {
      filterNote.innerHTML =
        'Tagged <span class="post-tag">' +
        escapeHtml(tag) +
        '</span> · <a href="index.html">all posts</a>';
    }
  }

  const pages = Math.max(1, Math.ceil(visible.length / POSTS_PER_PAGE));
  const current = Math.min(
    Math.max(parseInt(params.get("page"), 10) || 1, 1),
    pages,
  );
  const page = visible.slice(
    (current - 1) * POSTS_PER_PAGE,
    current * POSTS_PER_PAGE,
  );

  container.innerHTML =
    page.map(listItemMarkup).join("\n") ||
    '<p class="notice">Nothing here yet.</p>';

  if (pagination) {
    pagination.hidden = pages < 2;
    pagination.innerHTML =
      pages < 2 ? "" : paginationMarkup(current, pages, tag);
  }

  if (tag) document.title = "#" + tag + " — " + siteName();
}

/* --------------------------------------------------------- post page ---- */
function navigationMarkup(older, newer) {
  if (!older && !newer) return "";

  const parts = ['<div class="navigation">'];
  if (older) {
    parts.push(
      '<a class="prev" href="post.html?p=' +
        encodeURIComponent(older.slug) +
        '">&lt; ' +
        escapeHtml(older.title) +
        "</a>",
    );
  }
  if (newer) {
    parts.push(
      '<a class="next" href="post.html?p=' +
        encodeURIComponent(newer.slug) +
        '">' +
        escapeHtml(newer.title) +
        " &gt;</a>",
    );
  }
  parts.push("</div>");

  return parts.join("");
}

async function renderPostPage() {
  const container = document.getElementById("post-page");
  if (!container) return;

  const posts = await loadPosts();

  if (!posts) {
    container.innerHTML = emptyNotice();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("p") || window.location.hash.replace(/^#/, "");
  const index = posts.findIndex(function (post) {
    return post.slug === slug;
  });

  if (index === -1) {
    container.innerHTML =
      '<p class="notice">Post not found. ' +
      '<a href="index.html">All posts</a>.</p>';
    return;
  }

  const post = posts[index];
  const newer = posts[index - 1]; // the list is newest first
  const older = posts[index + 1];

  document.title = post.title + " — " + siteName();

  container.innerHTML = [
    '<div class="post-header">',
    '<div class="post-date">' + formatDate(post.date) + "</div>",
    shareMarkup(post),
    "</div>",
    '<div class="blog-post-content">',
    "<h1>" + escapeHtml(post.title) + "</h1>",
    renderMarkdown(post.markdown, BLOG_DIR),
    "</div>",
    tagsMarkup(post),
    navigationMarkup(older, newer),
  ].join("\n");
}

/* ------------------------------------------------------- copy link ------ */
document.addEventListener("click", function (event) {
  const button = event.target.closest
    ? event.target.closest(".copy-link")
    : null;
  if (!button) return;

  const url = button.getAttribute("data-url");
  const label = button.getAttribute("aria-label");

  function done() {
    button.setAttribute("aria-label", "Link copied");
    window.setTimeout(function () {
      button.setAttribute("aria-label", label);
    }, 1500);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, function () {});
  } else {
    window.prompt("Copy this link:", url);
  }
});

/* ---------------------------------------------------------------- boot -- */
if (document.getElementById("post-list")) renderIndexPage();
if (document.getElementById("post-page")) renderPostPage();

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();
