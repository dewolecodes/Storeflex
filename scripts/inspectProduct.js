const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

(async () => {
    try {
        const p = await db.product.findFirst();
        if (!p) {
            console.log('No product found');
        } else {
            console.log('Product:');
            console.log(JSON.stringify({ id: p.id, name: p.name, images: p.images, imagesPublicIds: p.imagesPublicIds }, null, 2));
        }
    } catch (e) {
        console.error('Error querying product:', e);
        process.exit(1);
    } finally {
        await db.$disconnect();
    }
})();
