import React, { useEffect } from 'react';

const TwitterEmbed = ({ tweetId }) => {
    useEffect(() => {
        if (window.twttr) {
            window.twttr.widgets.load();
        }
    }, [tweetId]);

    return (
        <blockquote className="twitter-tweet">
            <a href={`https://twitter.com/user/status/${tweetId}`}></a>
        </blockquote>
    );
};

export default TwitterEmbed;
