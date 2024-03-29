const mongoose = require('mongoose');
const slugify = require('slugify');
const geocoder = require('../utils/geocoder');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [30, 'Name can not be longer than 30 characters']
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  website: String,
  phone: String,
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  staff: {
    type: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }],
    unique: true,
    select: false
  },
  location: {
    // GeoJSON Point
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    formattedAddress: String,
    street: String,
    city: String,
    state: String,
    zipcode: String,
    country: String
  },
  suburb: {
    type: String,
    required: [true, 'Please add a suburb where a restaurant is located']
  },
  cuisine: {
    type: [String],
    required: [true, 'Please add a cuisine']
  },
  imageCover: String,
  images: [String],
  menu: [String],
  ratingsAverage: {
    type: Number,
    default: 0
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  delivery: {
    type: Boolean,
    default: false
  },
  takeaway: {
    type: Boolean,
    default: false
  },
  cashOnly: {
    type: Boolean,
    default: false
  },
  wheelchairAccessible: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Allow only one restaurant with a specific name per suburb
restaurantSchema.index({ name: 1, suburb: 1 }, { unique: true });

restaurantSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'restaurant',
  options: { sort: { createdAt: -1 } }
});

// Formalize values for better consistency
restaurantSchema.pre('save', async function () {
  // ex) grilled BURGER house -> Grilled BURGER House
  this.name = await this.name.split(' ').map(el => el.charAt(0).toUpperCase() + el.slice(1)).join(' ');

  // ex) BONDI beach -> Bondi Beach
  this.suburb = await this.suburb.split(' ').map(el => el.charAt(0).toUpperCase() + el.slice(1).toLowerCase()).join(' ');

  // ex) ITALIAN or italian -> Italian
  this.cuisine = await this.cuisine.map(el => el.charAt(0).toUpperCase() + el.slice(1).toLowerCase());
});

// Create URL-friendly slug from the name before save a document
restaurantSchema.pre('save', async function () {
  this.slug = await slugify(this.name, { lower: true });
});

// Create formatted location with geocoder
restaurantSchema.pre('save', async function () {
  const loc = await geocoder.geocode(this.address);

  this.location = {
    type: 'Point',
    coordinates: [loc[0].longitude, loc[0].latitude],
    formattedAddress: loc[0].formattedAddress,
    street: loc[0].streetName,
    city: loc[0].city,
    state: loc[0].stateCode,
    zipcode: loc[0].zipcode,
    country: loc[0].countryCode
  }

  // Don't save address in DB
  this.address = undefined;
});

// Delete all reviews when a restaurant is deleted
restaurantSchema.pre('remove', async function () {
  await this.model('Review').deleteMany({ restaurant: this._id });
});

module.exports = mongoose.model('Restaurant', restaurantSchema);