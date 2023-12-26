# Contribution guidelines

## Development environment

After cloning the repository a minimum setup recommended is to enable
the pre-commits from [`pre-commit.com`](https://pre-commit.com/) and
[`husky`](https://typicode.github.io/husky/):
```console
Setup a venv environment
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install pre-commit

Setup pre-commits
$ pre-commit install
$ npx husky-init

Configure the rest of the environment
$ npm install
```

The role of the pre-commits here is:
- Standardize coding styles
- Guarantee that `/dist` folder is compiled with `ncc`, bundling
  all dependencies

These rules are also enforced in the GitHub Action with
automatic commit pushes on PRs.
