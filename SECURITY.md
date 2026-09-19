# Security policy

DevTask handles authenticated user data and GitHub connection credentials. Please do not disclose a suspected vulnerability in a public issue.

## Reporting a vulnerability

Report security issues privately to the repository maintainers through the GitHub Security Advisories workflow, if enabled, or by contacting the project owner through the private contact channel associated with this repository. Include the affected commit or version, a clear description, reproduction steps, impact, and any suggested mitigation. Remove personal data, credentials, OAuth codes, and access tokens from the report.

Please allow maintainers reasonable time to investigate and release a fix before public disclosure. Reports involving leaked credentials should identify the credential type and location without including the secret itself; rotate the credential immediately when possible.

## Security expectations

- Keep Clerk secrets, GitHub OAuth secrets, access tokens, and encryption keys in server-side environment storage.
- Verify authenticated ownership in every Convex query, mutation, and action.
- Redact authorization headers, tokens, OAuth codes, and sensitive provider responses from logs.
- Use separate credentials and deployments for development and production.
- Never commit `.env` or copied production configuration.

This policy covers the code in this repository. Third-party services such as Clerk, Convex, GitHub, and Expo have their own security reporting processes.
