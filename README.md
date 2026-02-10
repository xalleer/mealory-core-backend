<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Local / VPS setup (dev + prod)

This repository is prepared to run:

- **Locally** with Docker Compose + PostgreSQL (and a separate test DB)
- **On a VPS** as two isolated environments (**dev** and **prod**) behind **Nginx Proxy Manager**
- **Deployment from GitHub Actions** (manual dispatch) to either dev or prod from the same branch

### Local run

```bash
docker compose -f docker-compose.local.yml up -d --build
```

- API: `http://localhost:3000`
- Postgres (local): `localhost:5432`
- Postgres (test): `localhost:5433`

### VPS prerequisites

- Docker + Docker Compose plugin installed
- Nginx Proxy Manager already running via Portainer
- DNS A-records pointing to your VPS IP:
  - `dev.kitchen-os.site`
  - `app.kitchen-os.site`

### VPS env files

On the VPS, inside the deployed directory (`VPS_APP_DIR`), create:

`.env.dev`

```bash
POSTGRES_PASSWORD=change_me_dev
```

`.env.prod`

```bash
POSTGRES_PASSWORD=change_me_prod
```

### VPS Docker Compose

Dev:

```bash
docker compose -f docker-compose.vps.dev.yml --env-file .env.dev up -d --build
```

Prod:

```bash
docker compose -f docker-compose.vps.prod.yml --env-file .env.prod up -d --build
```

Both VPS compose files expect an **external docker network** called `npm_proxy` (the network used by Nginx Proxy Manager). If your NPM network has a different name, change `networks.npm_proxy.external` name in the compose files.

### Nginx Proxy Manager routing

In NPM UI:

- **Proxy Host** `dev.kitchen-os.site`
  - Forward Hostname/IP: `api-dev`
  - Forward Port: `3000`
  - Select SSL certificate (Let’s Encrypt)

- **Proxy Host** `app.kitchen-os.site`
  - Forward Hostname/IP: `api-prod`
  - Forward Port: `3000`
  - Select SSL certificate (Let’s Encrypt)

Important:

- `api-dev` and `api-prod` are Docker network aliases to avoid name collisions when both stacks share the same NPM network.
- For NPM to resolve `api`, both stacks (dev/prod) must be attached to the same external network as NPM.

### GitHub Actions deploy

Workflow: `.github/workflows/deploy.yml`

Add repository secrets:

- `VPS_HOST` (e.g. `1.2.3.4`)
- `VPS_USER` (e.g. `root`)
- `VPS_SSH_KEY` (private key for SSH)
- `VPS_APP_DIR` (e.g. `/opt/mealory-core-backend`)

Then go to GitHub Actions:

- Select workflow **Deploy**
- Click **Run workflow**
- Choose `target`: `dev` or `prod`

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
