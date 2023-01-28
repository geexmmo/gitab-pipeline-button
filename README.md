# gitlab-pipeline-button
## What
This is a Node.js + Express.js + Pug web app.   
It presents a web interface that allows triggering runs of Gitlab pipelines on the specific branch on your project without accessing Gitlab's web interface or triggering pipeline runs from pushes or other pipelines.   
Also shows triggered jobs status and can fetch job logs.   
Authenticates users via LDAP and allows only specific ones to access the app.   
Skips jobs tagged with [ci skip]  

## Why
Imagine a website being developed for your company by another company.   
Your company policies disallow another company from accessing your infrastructure but allow you to fetch their changes from their repo.   
Your company content/web manager decides if it is time to update your website to the latest changes. While the test version of the website could be automatically fetched and deployed/destroyed with cronjob or other trigger - production can only be upgraded when the content/web manager had their fun with the test one and decided to do update.   
Also content/web manager dislikes or refuses to understand Gitlab pipelines but likes pressing buttons and seeing green but not red things on their screen.   
This gives them buttons to run updates configured by you.

## How
On your GitLab instance in your project - configure a separate branch and pipeline that should be manually started.
```yaml
stages:
 - update

update-job:
 when: manual
 stage: update
 script:
   - cp *.sh $APP_PATH
   - cd $APP_PATH
   - date
   - update-or-else.sh
```
* Edit app/config.js   
* build Docker image   
* OR manualy start with npm start?   
* Expose on nginx? example in nginx-example.conf


### Docker build
#### Run from project root
```bash
docker build -t update-button:latest -f docker/Dockerfile . 
```