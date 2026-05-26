const express = require('express');
const router = express.Router();
const { getMenu } = require('../../controllers/Menu/menuController');

router.get('/', getMenu);
module.exports = router;
