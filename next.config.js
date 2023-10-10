module.exports = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'max-age=0, s-maxage=30, stale-while-revalidate=30',
                    }
                ],
            },
        ]
    },
}