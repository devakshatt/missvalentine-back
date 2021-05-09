const Product = require('../models/product');
const SubCategory = require('../models/subcategory');
const Category = require('../models/category');
const fs = require('fs');
const path = require('path');

const { uploadFile, deleteFile } = require('../awsSetup');

exports.getProductById = (req, res, next, id) => {
  Product.findById(id)
    // .populate('category')
    .exec((err, product) => {
      if (err || !product) {
        return res.json({
          Error: 'No Product Found in Inventory ',
        });
      }
      req.product = product;
      next();
    });
};

exports.getAllProduct = async (req, res, next) => {
  try {
    return await Product.find()
      .sort({ createdAt: -1 })
      .populate('subCategories')
      .populate('category')
      .limit(req.body.limit ? req.body.limit : 33)
      .exec((err, products) => {
        if (err) {
          return res.json({
            error: 'Not able to fetch products',
            success: false,
          });
        }
        return res.status(200).json({
          success: true,
          count: products.length,
          data: products,
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
  next();
};

exports.getOneProduct = async (req, res, next) => {
  try {
    return await Product.findById(req.product._id)
      .populate('category')
      .populate('subCategories')
      .exec((err, product) => {
        if (err) {
          return res.json({
            error: 'Not able to fetch product',
            success: false,
          });
        }
        return res.status(200).json({
          success: true,
          data: product,
        });
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

exports.createProduct = async (req, res, next) => {
  const product = new Product();
  var filesArray = req.files;

  filesArray.map((item, index) => {
    if (item.fieldname == 'images') {
      const fileName = `prd-${product._id}-${index}`;
      const fileUrl = `https://missvalentine-images.s3.amazonaws.com/${fileName}`;

      uploadFile(fileName, fs.readFileSync(item.path));

      product.images.push({
        data: fileUrl,
        contentType: item.mimetype,
      });
    }
  });

  // product.images = filesArray;
  product.name = req.body.name;
  product.shortDesc = req.body.shortDesc;
  product.description = req.body.description;
  product.category = req.body.category;
  product.price = req.body.price;
  product.hidden = req.body.hidden;
  product.sizes = JSON.parse(req.body.sizes);
  product.colors = JSON.parse(req.body.colors);
  product.subCategories = JSON.parse(req.body.subCategories);

  Category.updateOne(
    { _id: product.category },
    {
      $push: {
        products: product._id,
      },
    }
  ).exec((err, cate) => {
    // console.log('', err, cate);
  });

  SubCategory.updateMany(
    {
      _id: {
        $in: product.subCategories,
      },
    },
    {
      $push: {
        products: product._id,
      },
    }
  ).exec((err, cate) => {
    // console.log('', err, cate);
  });
  console.log('saving prod');

  product.save((err, prd) => {
    if (err) {
      console.log('err', err);
      return res.json({
        message: 'Not able to Add Product',
        data: product,
        success: false,
      });
    }
    return res.json({
      data: prd,
      success: true,
      message: 'Product Added Successfully',
    });
  });
};

exports.updateProduct = (req, res) => {};
// exports.deleteProduct = (req, res) => {
//   let product = req.product;
//   product.remove.exec((err, products) => {
//     if (err) {
//       return res.json({
//         error: ' not Deleted',
//         success: false,
//       });
//     }
//     return res.status(200).json({
//       success: true,
//       message: 'Deleted Successfully',
//     });
//   });
// };
exports.deleteProduct = (req, res) => {
  let product = req.product;
  for (let i = 0; i < product.images.length; i++) {
    const fileName = `prd-${product._id}-${i}`;
    console.log('fileName', fileName);
    deleteFile(fileName);
  }

  product.remove((err, product) => {
    if (err) {
      return res.status(400).json({
        err,
        Error: 'Product deletion Failed',
        success: false,
      });
    }
    // product.photo = undefined;
    res.status(200).json({
      message: 'Product Removed Successfully',
      productDetails: product,
      success: true,
    });
  });
};
