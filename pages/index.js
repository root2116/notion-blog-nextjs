import Head from "next/head";
import Link from "next/link";
import { getDatabase } from "../lib/notion";
import { Text } from "./[id].js";
import styles from "./index.module.css";

export const databaseId = process.env.NOTION_DATABASE_ID;


export default function Home({ posts }) {
  return (
    <div>
      <Head>
        <title>Just an Asile</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.container}>
        <header className={styles.header}>
    
            <img src="/logo.PNG" className={styles.logos} ></img>

          <h1>Just an Asile</h1>
          <p>
            日向坂46の歌詞の翻訳を置いたり、推し活の記録を残したり
          </p>
        </header>

        <h2 className={styles.heading}>All Posts</h2>
        <ol className={styles.posts}>
          {posts.map((post) => {
            const date = new Date(post.last_edited_time).toLocaleString(
              "en-US",
              {
                month: "short",
                day: "2-digit",
                year: "numeric",
              }
            );

            const thumbnailUrl = post.properties.Thumbnail.files[0].file.url;
            
            return (
              <li key={post.id} className={styles.post}>
                {thumbnailUrl && (
                    <Link href={`/${post.id}`}>
                    <img className={styles.thumbnail} src={thumbnailUrl} alt={post.properties.Name.title} />
                    </Link>
                )}
                <h3 className={styles.postTitle}>
                  <Link href={`/${post.id}`}>
                    <Text text={post.properties.Name.title} />
                  </Link>
                </h3>

                <p className={styles.postDescription}>{date}</p>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}

export const getStaticProps = async () => {
  const database = await getDatabase(databaseId);
  
  const publishedPosts = database.filter(post => post.properties.Published.checkbox === true);

  publishedPosts.sort((a, b) => {
    const dateA = new Date(a.properties['Pub Date'].date.start);
    const dateB = new Date(b.properties['Pub Date'].date.start);

    // For descending order, switch 'dateA' and 'dateB'
    return dateB - dateA;
  });

  return {
    props: {
        posts: publishedPosts,
    },
    revalidate: 1,
  };
};
