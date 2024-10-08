const { Pool } = require('pg');

const pool = new Pool({
  user: "labber",
  password: "labber",
  host: "localhost",
  database: "lightbnb",
});




const properties = require("./json/properties.json");
const users = require("./json/users.json");

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */


const getUserWithEmail = function (email) {
  const queryString = `
    SELECT * 
    FROM users 
    WHERE email = $1;
  `;

  return pool
    .query(queryString, [email])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.error("Query error", err.stack);
    });
};


/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */


const getUserWithId = function (id) {
  const queryString = `
    SELECT * 
    FROM users 
    WHERE id = $1;
  `;

  return pool
    .query(queryString, [id])
    .then((result) => {
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    })
    .catch((err) => {
      console.error("Query error", err.stack);
    });
};


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = function (user) {
  const { name, email, password } = user;
  const queryString = `
    INSERT INTO users (name, email, password) 
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  return pool
    .query(queryString, [name, email, password])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.error("Query error", err.stack);
    });
};


/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
    SELECT reservations.id, properties.title, avg(property_reviews.rating) as average_rating
    FROM reservations
    JOIN properties ON properties.id = reservations.property_id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
      AND reservations.end_date < now()::date
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2;
  `;
  
  const queryParams = [guest_id, limit];

  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.error(err.message);
    });
};



/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE 1=1
  `;

  let whereClauses = [];
  let havingClauses = [];

  // Use a switch statement to handle each filter option
  Object.keys(options).forEach((key) => {
    switch (key) {
      case 'city':
        queryParams.push(`%${options[key]}%`);
        whereClauses.push(`city LIKE $${queryParams.length}`);
        break;
      case 'owner_id':
        queryParams.push(options[key]);
        whereClauses.push(`owner_id = $${queryParams.length}`);
        break;
      case 'minimum_price_per_night':
        queryParams.push(options[key] * 100); // Convert dollars to cents
        whereClauses.push(`cost_per_night >= $${queryParams.length}`);
        break;
      case 'maximum_price_per_night':
        queryParams.push(options[key] * 100); // Convert dollars to cents
        whereClauses.push(`cost_per_night <= $${queryParams.length}`);
        break;
      case 'minimum_rating':
        queryParams.push(options[key]);
        havingClauses.push(`avg(property_reviews.rating) >= $${queryParams.length}`);
        break;
      default:
        break; // Ignore unknown keys
    }
  });

  // Add WHERE clause if there are any filters
  if (whereClauses.length > 0) {
    queryString += ` AND ${whereClauses.join(' AND ')} `;
  }

  // Add HAVING clause if there are any aggregate filters
  if (havingClauses.length > 0) {
    queryString += ` HAVING ${havingClauses.join(' AND ')} `;
  }

  // Add GROUP BY, ORDER BY, and LIMIT clauses
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;


  return pool
    .query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((err) => {
      console.error(err.message);
    });
};



/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function (property) {
  const {
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    street,
    city,
    province,
    post_code,
    country,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms
  } = property;

  const queryString = `
    INSERT INTO properties (
      owner_id,
      title,
      description,
      thumbnail_photo_url,
      cover_photo_url,
      cost_per_night,
      street,
      city,
      province,
      post_code,
      country,
      parking_spaces,
      number_of_bathrooms,
      number_of_bedrooms
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *;
  `;

  const queryParams = [
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    street,
    city,
    province,
    post_code,
    country,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms
  ];

  return pool
    .query(queryString, queryParams)
    .then((result) => result.rows[0])
    .catch((err) => {
      console.error("Query error", err.stack);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
