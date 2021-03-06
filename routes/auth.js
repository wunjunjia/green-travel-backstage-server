const express = require('express');
const axios = require('axios');
const { query } = require('../init/mysql');
const { GITHUB_OAUTH_URL, CLIENT_ID, CLIENT_SECRET } = require('../config/auth');
const router = express.Router();

router.get('/login', async (req, res) => {
  let target = {
    id: 123456,
    name: 'xiaoming',
  };
  axios.post('http://localhost:8080/green_travel/api/Authentication.action', target)
    .then((result) => {
      const { code }  = result.data;
      if (code === 0) {
        req.session.user = target;
        return res.redirect('/admin');
      }
      res.send(code);
    }).catch((e) => {
      console.log(e);
      res.send('server errror!');
    });
});

// router.get('/login', async (req, res) => {
//   let target = {
//     id: 123456,
//     name: 'xiaoming',
//   };
//   let result = await query('select * from user where id = ? limit 1', [target.id]);
//   if (result.length === 0) {
//     await query('insert into user(id, name, integral) values(?, ?, 0)', [target.id, target.name]);
//     await query('insert into level(user_id, lv, growth) values(?, 1, 0)', [target.id]);
//   }
//   req.session.user = target;
//   const url = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/admin' : '/admin';
//   res.redirect(url);
// });

router.get('/logout', (req, res) => {
  req.session.user = null;
  return res.send();
});

async function save(req, res, user) {
  try {
    let result = await query('select * from user where id = ? limit 1', [user.id]);
    let target;
    if (result.length === 0) {
      target = {
        id: user.id,
        name: user.name,
      };
      await query('insert into user(id, name, integral) values(?, ?, 0)', [target.id, target.name]);
      await query('insert into level(user_id, lv, growth) values(?, 1, 0)', [target.id]);
    } else {
      target = result[0];
      if (result.length === 0) return res.json({ code: 1 });
    }
    req.session.user = target;
    const url = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/admin' : '/admin';
    res.redirect(url);
  } catch(e) {
    console.log(e);
    res.send('server error');
  };
}

// router.get('/login', (req, res) => {
//   return res.redirect(GITHUB_OAUTH_URL);
// });

router.get('/auth', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.send('the code is lost!');
  }
  let result = await axios.post('https://github.com/login/oauth/access_token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
  }, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (result.status !== 200) return res.send('github auth fail!');
  if (result.data.error) return res.send('the code is expired!');
  const { token_type, access_token } = result.data;
  result = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `${token_type} ${access_token}`,
    },
  });
  if (result.status !== 200) return res.send('get user information fail!');
  save(req, res, result.data);
});

module.exports = router;