import { getDatabase } from "../lib/notion";

const databaseId = process.env.NOTION_DATABASE_ID;

export default async (req, res) => {
    try {
        const database = await getDatabase(databaseId);
        const publishedPosts = database.filter(
            (post) => post.properties.Published.checkbox === true
        );

        res.setHeader("Content-Type", "text/xml");
        res.write(createSitemap(publishedPosts));
        res.end();
    } catch (e) {
        res.statusCode = 500;
        res.end();
    }
};

const createSitemap = (posts) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${posts
            .map((post) => {
                const { id } = post;
                return `
                <url>
                    <loc>${`https://just-an-asile.vercel.app/${id}`}</loc>
                    <lastmod>${new Date(
                    post.last_edited_time
                ).toISOString()}</lastmod>
                </url>
            `;
            })
            .join("")}
    </urlset>
  `;
};
