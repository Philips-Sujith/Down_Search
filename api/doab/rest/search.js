export default async function handler(req, res) {
    try {
        const params = new URLSearchParams(req.query);

        const url = `https://directory.doabooks.org/rest/search?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                Accept: 'application/json'
            }
        });

        const data = await response.text();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (!response.ok) {
            return res.status(response.status).send(data);
        }

        res.status(200).send(data);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: 'DOAB proxy failed',
            message: error.message
        });
    }
}