/* eslint-disable guard-for-in */
/* eslint-disable require-jsdoc */
const CONFIG = require('./config.js');
const cookieSession = require('cookie-session');
const axios = require('axios');
const express = require('express');
const app = express();
const Convert = require('ansi-to-html');
const convert = new Convert({newline: true});

const bodyParser = require('body-parser');

const passport = require('passport');
const CustomStrategy = require('passport-custom').Strategy;
const {authenticate} = require('ldap-authentication');
// const {response} = require('express');

passport.use('ldap', new CustomStrategy(
    async function(req, done) {
      try {
        if (!req.body.username || !req.body.password) {
          throw new Error('username and password are not provided')
        }
        const ldapAdminDn = CONFIG.ldap.adminDN;
        const ldapAdminPw = CONFIG.ldap.adminPW;
        const ldapBaseDn = CONFIG.ldap.dn;
        const userParam = CONFIG.ldap.userParam;
        const options = {
          ldapOpts: {
            url: CONFIG.ldap.url,
            connectTimeout: CONFIG.ldap.ldapTimeout,
          },
          adminDn: `${ldapAdminDn}`,
          adminPassword: `${ldapAdminPw}`,
          // userDn: `uid=${req.body.username},${ldapBaseDn}`,
          userSearchBase: ldapBaseDn,
          usernameAttribute: userParam,
          userPassword: req.body.password,
          username: req.body.username,
          attributes: ['givenName', 'sAMAccountName'],
        };
        // ldap authenticate the user
        const user = await authenticate(options);
        // success
        done(null, user);
      } catch (error) {
        // authentication failure
        done(error, null);
      }
    },
),
);

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});
const sessionMiddleWare = cookieSession({
  name: 'session',
  keys: [CONFIG.secret],
  maxAge: 24 * 60 * 60 * 1000,
});
app.use(bodyParser.urlencoded({extended: true}));
app.use(sessionMiddleWare);
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'pug');


//
// getPipelineID
//
async function getPipelineID() {
  try {
    await axios({
      url: CONFIG.gitlab.uri + CONFIG.gitlab.projectID+`/pipelines?ref=` + CONFIG.gitlab.ref,
      method: 'GET',
      headers: {'PRIVATE-TOKEN': `${CONFIG.gitlab.personalToken}`}
    }).then(
    function(ret) {
      // gets all pipeline ids and finds latest pipeline id
      pipelineID = Math.max(...ret.data.map(pipeline => pipeline.id))
    }).catch(function (err) {
        console.error('request err getPipelineID', err.message);
    })
    return pipelineID;
  } catch (error) {
    console.error('ERROR getPipelineID', error.data)
  }
}

//
// getJobsIDs
//
async function getJobsIDs(pipelineID) {
  try {
    await axios({
      url: CONFIG.gitlab.uri + CONFIG.gitlab.projectID + `/pipelines/` + pipelineID + `/jobs`,
      method: 'GET',
      headers: {'PRIVATE-TOKEN': `${CONFIG.gitlab.personalToken}`}
    }).then(
    function(ret) {
      // gets all pipeline ids and finds latest pipeline id
      jobIDs = ret.data.map(({id, name}) => ({id, name})).sort((a,b) => a.id + b.id)
    }).catch(function (err) {
        console.error('request err getJobsIDs', err.message);
    })
    return jobIDs;
  } catch (error) {
    console.error('ERROR getJobsIDs', error.data)
  }
}

//
// runJobsIDs
//  
async function runJobsIDs(jobIDs) {
  const jobLaunchStatus = [];
  for (index in jobIDs) {
    try {
      await axios({
        url: CONFIG.gitlab.uri + CONFIG.gitlab.projectID + `/jobs/`+ jobIDs[index].id + `/play`,
        method: 'POST',
        headers: {'PRIVATE-TOKEN': `${CONFIG.gitlab.personalToken}`}
      }).then(
      function(ret) {
        const data = {
          id: ret.data.id,
          name: ret.data.name,
          status: ret.data.status,
          created_at: ret.data.created_at }
        jobLaunchStatus.push(data)
      }).catch(function (err) {
          console.error('request err runJobsIDs', err.message);
          const data =  {
            id: jobIDs[index].id,
            name: jobIDs[index].name,
            status: error.message,
            // status: error.response.data.message,
            created_at: 0 }
          jobLaunchStatus.push(data)
      })
    } catch (error) {
      console.error('ERROR runJobsIDs', error.data)
    }
  }
  return jobLaunchStatus;
}

//
// getLogs
//
async function getLogs(jobIDs) {
  const logsReturnStatus = [];
  for (index in jobIDs) {
    try {
      await axios({
        url: CONFIG.gitlab.uri + CONFIG.gitlab.projectID + `/jobs/`+ jobIDs[index].id + `/trace`,
        method: 'GET',
        responseType: 'text',
        headers: {'PRIVATE-TOKEN': `${CONFIG.gitlab.personalToken}`}
      }).then(
      function(ret) {
        // gets all pipeline ids and finds latest pipeline id
        logsReturnStatus.push({id: jobIDs[index].id, name: jobIDs[index].name,
          status: convert.toHtml(ret.data)});
      }).catch(function(err) {
          console.error('request err getJobsIDs', err.message);
          const data = [{
            id: jobIDs[index].id,
            name: jobIDs[index].name,
            status: error.response.data.message,}];
          logsReturnStatus.push(data);
      })
    } catch (error) {
      console.error('ERROR getJobsIDs', error.data)
    }
  }
  return logsReturnStatus;
}
//
// == functions end
//
// PAGES
// logs page
app.get('*/logs$', (req, res) => {
  const user = req.user;
  if (!user) {
    res.redirect('./');
    return;
  }
  if (!user['sAMAccountName'] in CONFIG.users) {
    res.redirect('./');
    return;
  }
  getPipelineID().then(pipelineID => {
    console.log('/logs gets pipelineID',pipelineID)
    getJobsIDs(pipelineID).then(jobIDs => {
      console.log('/logs gets jobIDs', jobIDs)
      getLogs(jobIDs).then((logsReturn) =>
      res.render('logs',
          {
            userDisplayName: user.sAMAccountName,
            logo: CONFIG.logo,
            logsReturn,
          },
      ));
    })
  });
});

// run page
app.get('*/run$', (req, res) => {
  let user = req.user
  if (!user) {
    res.redirect('./')
    return
  }
  if (!user['sAMAccountName'] in CONFIG.users) {
    res.redirect('./')
    return
  }
  getPipelineID().then(pipelineID => {
    console.log('/run gets pipelineID',pipelineID)
    getJobsIDs(pipelineID).then(jobIDs => {
      console.log('/run gets jobIDs', jobIDs)
      runJobsIDs(jobIDs).then(jobsLaunched =>
        res.render('run',
        {
          userDisplayName: user.sAMAccountName,
          logo: CONFIG.logo,
          jobsLaunched,
        }))
    })
  });
})

// menu page
app.get('*/menu$', (req, res) => {
  let user = req.user
  if (!user) {
    res.redirect('./')
    return
  }
  if (!user['sAMAccountName'] in CONFIG.users) {
    res.redirect('./')
    return
  }
  getPipelineID().then(pipelineID => {
      console.log('/menu gets pipelineID',pipelineID)
      getJobsIDs(pipelineID).then(jobIDs => {
        console.log('/menu gets jobIDs', jobIDs)
        res.render('menu', {
          userDisplayName: user.sAMAccountName,
          logo: CONFIG.logo,
          GitlabURI: CONFIG.gitlab.uri,
          ProjectID: CONFIG.gitlab.projectID,
          jobIDs
          })
      })
  });
})

// user post username and password
app.post('*/login$',
  passport.authenticate('ldap', { failureRedirect: './login' }),
  function (req, res) {
    res.redirect('./menu');
  }
)

// passport standard logout call.
app.get('*/logout$', (req, res) => {
  req.logout();
  res.redirect('./');
})

// the login page
app.get('*/$', function (req, res) {
  res.render('index', { logo: CONFIG.logo})
})

// Start server
let port = 8080
console.log(`app is listening on port ${port}`)
app.listen(port, '0.0.0.0')