const express = require("express");
const { compare, getFile } = require("./controller");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const router = express.Router();

// router.get('/compareMetadata', compareMetadata);
router.get("/compare", compare);
router.get("/file/:id", getFile);
router.get("/file-info/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log({ id });
    const foundFile = await prisma.file.findFirst({
      where: { id: Number(id) },
    });
    console.log(foundFile);
    return res.json(foundFile);
  } catch (error) {
    console.log(error);
    res.status(404).json({ message: "Some error occured" });
  }
});

// router.get('/compareContent', compareContent);

module.exports = router;
