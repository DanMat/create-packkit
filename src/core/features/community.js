export default {
  id: 'community',
  active: (cfg) => cfg.license !== 'none' || cfg.community,
  apply(cfg) {
    const files = {};
    const year = new Date().getFullYear();
    const holder = cfg.author || 'the authors';

    if (cfg.license === 'MIT') files['LICENSE'] = mit(year, holder);
    else if (cfg.license === 'ISC') files['LICENSE'] = isc(year, holder);
    else if (cfg.license === 'Apache-2.0') files['LICENSE'] = apacheStub(year, holder);

    if (cfg.community) {
      files['CONTRIBUTING.md'] = contributing(cfg);
      files['CODE_OF_CONDUCT.md'] = codeOfConduct(cfg);
      files['SECURITY.md'] = security();
      files['.github/ISSUE_TEMPLATE/bug_report.md'] = bugReport();
      files['.github/ISSUE_TEMPLATE/feature_request.md'] = featureRequest();
      files['.github/PULL_REQUEST_TEMPLATE.md'] = prTemplate();
    }

    return { files, pkg: {} };
  },
};

function mit(year, holder) {
  return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function isc(year, holder) {
  return `ISC License

Copyright (c) ${year} ${holder}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
`;
}

function apacheStub(year, holder) {
  return `Copyright ${year} ${holder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Full text: https://www.apache.org/licenses/LICENSE-2.0.txt
`;
}

function contributing(cfg) {
  const pm = cfg.packageManager;
  const install = pm === 'npm' ? 'npm install' : `${pm} install`;
  return `# Contributing

Thanks for your interest in contributing!

## Development

\`\`\`sh
${install}
${pm === 'npm' ? 'npm test' : pm + ' test'}
\`\`\`

## Pull requests

- Create a branch, make your change, and open a PR against \`main\`.
- Make sure lint, types and tests pass.
${cfg.release === 'changesets' ? '- Run `npx changeset` to describe your change for the changelog.\n' : ''}
`;
}

function codeOfConduct() {
  return `# Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating, you are expected to uphold this code. Report unacceptable
behavior to the maintainers.
`;
}

function security() {
  return `# Security Policy

If you discover a security vulnerability, please **do not** open a public issue.
Instead, report it privately to the maintainers (e.g. via GitHub Security
Advisories). We will respond as quickly as possible.
`;
}

function bugReport() {
  return `---
name: Bug report
about: Report a problem
labels: bug
---

**Describe the bug**

**To reproduce**

**Expected behavior**

**Environment**
- Version:
- Node:
- OS:
`;
}

function featureRequest() {
  return `---
name: Feature request
about: Suggest an idea
labels: enhancement
---

**Problem**

**Proposed solution**

**Alternatives considered**
`;
}

function prTemplate() {
  return `## Summary

<!-- What does this change and why? -->

## Checklist

- [ ] Tests pass
- [ ] Lint & types pass
- [ ] Docs updated if needed
`;
}
