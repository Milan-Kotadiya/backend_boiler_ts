import { gql } from "graphql-tag"; // ✅ Correct import for Apollo Server v4+

const typeDefs = gql`
  # Root query type definition
  type Query {
    getUser(id: ID!): User
    getUsers: [User]
  }

  # Response type for authentication
  type AuthResponse {
    user: User
    token: String
  }

  # Mutation type definition
  type Mutation {
    register(username: String!, password: String!, email: String!): User
    login(email: String!, password: String!): AuthResponse
  }

  # User type
  type User {
    id: ID!
    password: String!
    email: String!
  }

  # Subscription type definition
  type Subscription {
    userRegistered: User
    userLogged: AuthResponse
  }
`;

export default typeDefs;
