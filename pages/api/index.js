import { NextApiHandler } from "next";

const handler = async (req, res) => {
    const secret = req.query.secret ?? req.body.secret

    // const id = req.query.id
    if (secret !== "hogehoge") {
        return res.status(401).json({ message: 'Invalid token' })
    }

    // if (!id) return res.status(404).json({ message: 'Not Found' })

    try {
        await res.revalidate(`/`)
        return res.json({ revalidated: true })
    } catch (err) {
        return res.status(500).send('Error revalidating')
    }
}

export default handler