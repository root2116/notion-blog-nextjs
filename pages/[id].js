import { Fragment } from "react";
import Head from "next/head";
import { getDatabase, getPage, getBlocks } from "../lib/notion";
import Link from "next/link";
import { databaseId } from "./index.js";
import styles from "./post.module.css";
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import TwitterEmbed from '../components/TwitterEmbed';
import TableOfContents from '../components/TableOfContents';
import { downloadAndResizeImage } from '../lib/imageUtils';
import path from 'path';

import { uploadToS3, checkFileExistsInS3 } from '../lib/awsUtils';

const ogs = require('open-graph-scraper');
const Jimp = require('jimp');




const bucketName = 'just-an-asile';

const generateTableOfContents = (blocks) => {
    const headers = blocks.filter(block =>
        block.type === 'heading_1' ||
        block.type === 'heading_2' ||
        block.type === 'heading_3'
    );

    return headers.map(header => ({
        id: header.id,
        text: header[header.type].rich_text[0].plain_text,
        type: header.type
    }));
};


export const Text = ({ text }) => {
  if (!text) {
    return null;
  }

  

  return text.map((value) => {
    const {
      annotations: { bold, code, color, italic, strikethrough, underline },
      text,
      type,
      equation
    } = value;
    
    if (type === "equation") {
      const equationHtml = katex.renderToString(equation.expression, {
        throwOnError: false,
      });
      return <span dangerouslySetInnerHTML={{ __html: equationHtml }} />;
    }

    return (
      <span
        className={[
          bold ? styles.bold : "",
          code ? styles.code : "",
          italic ? styles.italic : "",
          strikethrough ? styles.strikethrough : "",
          underline ? styles.underline : "",
        ].join(" ")}
        style={color !== "default" ? { color } : {}}
        key={text.content}
      >
        {text.link ? <a href={text.link.url}>{text.content}</a> : text.content}
      </span>
    );
  });
};

const renderNestedList = (block) => {
  const { type } = block;
  const value = block[type];
  if (!value) return null;

  const isNumberedList = value.children[0].type === "numbered_list_item";

  if (isNumberedList) {
    return <ol>{value.children.map((block) => renderBlock(block))}</ol>;
  }
  return <ul>{value.children.map((block) => renderBlock(block))}</ul>;
};

const renderBlock = (block, embedData=null, tableOfContents=null) => {
  const { type, id } = block;
  const value = block[type];

  switch (type) {
    case "paragraph":
      return (
        <p>
          <Text text={value.rich_text} />
        </p>
      );
    case "heading_1":
      return (
        <h1 id={id}>
          <Text text={value.rich_text} />
        </h1>
      );
    case "heading_2":
      return (
        <h2 id={id}>
          <Text text={value.rich_text} />
        </h2>
      );
    case "heading_3":
      return (
        <h3 id={id}>
          <Text text={value.rich_text} />
        </h3>
      );
    case "bulleted_list": {
      return <ul>{value.children.map((child) => renderBlock(child))}</ul>;
    }
    case "numbered_list": {
      return <ol>{value.children.map((child) => renderBlock(child))}</ol>;
    }
    case "bulleted_list_item":
    case "numbered_list_item":
      return (
        <li key={block.id}>
          <Text text={value.rich_text} />
          {!!value.children && renderNestedList(block)}
        </li>
      );
    case "to_do":
      return (
        <div>
          <label htmlFor={id}>
            <input type="checkbox" id={id} defaultChecked={value.checked} />{" "}
            <Text text={value.rich_text} />
          </label>
        </div>
      );
    case "toggle":
      return (
        <details>
          <summary>
            <Text text={value.rich_text} />
          </summary>
          {block.children?.map((child) => (
            <Fragment key={child.id}>{renderBlock(child)}</Fragment>
          ))}
        </details>
      );
    case "child_page":
      return (
        <div className={styles.childPage}>
          <strong>{value.title}</strong>
          {block.children.map((child) => renderBlock(child))}
        </div>
      );
    case "image":
      const src =
        value.type === "external" ? value.external.url : value.file.url;
      const caption = value.caption ? value.caption[0]?.plain_text : "";
      return (
        <figure>
          <img src={src} alt={caption} />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    case "divider":
      return <hr key={id} />;
    case "quote":
      return <blockquote key={id} className={styles.quote}>{value.rich_text[0].plain_text}</blockquote>;
    case "code":
      const codeBlock = value.rich_text[0];
      const codeString = codeBlock.plain_text || "";
      const language = value.language;
      return (
        <SyntaxHighlighter language={language} style={atomDark}>
          {codeString}
        </SyntaxHighlighter>
      );
    case "file":
      const src_file =
        value.type === "external" ? value.external.url : value.file.url;
      const splitSourceArray = src_file.split("/");
      const lastElementInArray = splitSourceArray[splitSourceArray.length - 1];
      const caption_file = value.caption ? value.caption[0]?.plain_text : "";
      return (
        <figure>
          <div className={styles.file}>
            📎{" "}
            <Link href={src_file} passHref>
              {lastElementInArray.split("?")[0]}
            </Link>
          </div>
          {caption_file && <figcaption>{caption_file}</figcaption>}
        </figure>
      );
    case "bookmark": {
      const href = value.url;
      const embedInfo = embedData.find(data => data.blockId === id);
      if (embedInfo) {
        const { ogTitle: title, ogDescription: description, ogImage } = embedInfo.data;
        const image = ogImage ? ogImage.url : null;
        return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              <div className={styles.embedContainer}>
                
                <img className={styles.embedImage} src={image} alt={title} />
                
                <div className={styles.embedContent}>
                  <div className={styles.embedTitle}>{title}</div>
                  <div className={styles.embedDescription}>{description}</div>
                </div>
              </div>
            </a>
        );
      } else {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {href}
          </a>
        );
      }
    }
    case "table": {
      return (
        <table className={styles.table}>
          <tbody>
            {block.children?.map((child, i) => {
              const RowElement =
                value.has_column_header && i == 0 ? "th" : "td";
              return (
                <tr key={child.id}>
                  {child.table_row?.cells?.map((cell, i) => {
                    return (
                      <RowElement key={`${cell.plain_text}-${i}`}>
                        <Text text={cell} />
                      </RowElement>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    case "column_list": {
      return (
        <div className={styles.row}>
              {block.children && block.children.map((block) => renderBlock(block))}
        </div>
      );
    }
    case "column": {
      return <div>{block.children.map((child) => renderBlock(child))}</div>;
    }
    case 'equation': {
        const equationHtml = katex.renderToString(value.expression, {
            throwOnError: false,
        });
        return (
            <div dangerouslySetInnerHTML={{ __html: equationHtml }} />
        );
    }
    case 'callout': {
      return (
        <div className={styles.callout}>
          {value.icon && <span className={styles.calloutIcon}>{value.icon.emoji}</span>}
          <div>
            <Text text={value.rich_text} />
          </div>
        </div>
      );
    }
    case 'embed': {
        // if the url is a twitter url, render the twitter embed
        if (value.url.includes('x.com') || value.url.includes('twitter.com')) {
            return <TwitterEmbed tweetId={value.url.split('/').pop()} />;
        }
    }
    case 'table_of_contents' :{
        return <TableOfContents headers={tableOfContents} />
    }
    default:
      return `❌ Unsupported block (${
        type === "unsupported" ? "unsupported by Notion API" : type
      })`;
  }
};

export default function Post({ page, blocks, embedData }) {
  if (!page || !blocks) {
    return <div />;
  }
  const tableOfContents = generateTableOfContents(blocks);
  return (
    <div>
      <Head>
        <title>{page.properties.Name.title[0].plain_text}</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href={"https://just-an-asile.com/" + page.id} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ref3rdper" /> 
        <meta name="twitter:title" content={page.properties.Name.title[0].plain_text} />
        <meta name="twitter:description" content="" />
        <meta name="twitter:image" content={page.properties.Thumbnail.files[0]?.file?.url || '' } />
        <meta property="og:image" content={page.properties.Thumbnail.files[0]?.file?.url || ''} />
        <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
      </Head>
      
      <article className={styles.container}>
        <h1 className={styles.name}>
          <Text text={page.properties.Name.title} />
        </h1>
        <section>
          {blocks.map((block) => (
            <Fragment key={block.id}>{renderBlock(block, embedData, tableOfContents)}</Fragment>
          ))}
          <Link href="/" className={styles.back}>
            ← Go home
          </Link>
        </section>
      </article>
    </div>
  );
}

export const getStaticPaths = async () => {
  const database = await getDatabase(databaseId);
  return {
    paths: database.map((page) => ({ params: { id: page.id } })),
    fallback: true,
  };
};

export const getStaticProps = async (context) => {
  const { id } = context.params;
  const page = await getPage(id);
  const blocks = await getBlocks(id);

  const thumbnailUrl = page.properties.Thumbnail.files[0]?.file?.url
  if (thumbnailUrl) {
    const imageName = `${page.id}.png`

    // const buffer = await downloadAndResizeImage(thumbnailUrl, 1000)
    // const imageUrl = await uploadToS3(buffer, imageName, bucketName)
    
        

    // Replace the thumbnail URL
      page.properties.Thumbnail.files[0].file.url = `https://${bucketName}.s3.ap-northeast-1.amazonaws.com/${imageName}`;
  }

  const bookmarks = blocks.filter(block => block.type === 'bookmark');
  
  const embedPromises = bookmarks.map(async (block) => {
    const { url } = block.bookmark;
    const { result } = await ogs({ url });
    return {
      blockId: block.id,
      data: result,
    };
  });

    for (const block of blocks) {
        if (block.type === 'image') {
            const imgUrl = block.image.file.url
            const imageName = `${block.id}.png`
            
            
            // const buffer = await downloadAndResizeImage(imgUrl, 1000)
            // await uploadToS3(buffer, imageName, bucketName)
            
            

            // Replace the image URL
            block.image.file.url =  `https://${bucketName}.s3.ap-northeast-1.amazonaws.com/${imageName}`;
            

        }
    }

  const embedData = await Promise.all(embedPromises);
  return {
    props: {
      page,
      blocks,
      embedData,
    },
    revalidate: 60
  };
};
