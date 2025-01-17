const Sitemap = () => { };


export const getServerSideProps = async ({ res }) => {
    const response = await fetch("https://just-an-asile.com/api/generate-sitemap");
    const text = await response.text();

    res.setHeader("Content-Type", "text/xml");
    res.write(text);
    res.end();
    return {
        props: {},
    };
};


export default Sitemap;