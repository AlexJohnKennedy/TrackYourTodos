# This docker file builds an image which runs the ASP.NET Core backend in 'DockerDevelopment' mode, using 'dotnet run', rather than using 
# and actualy dotnet publish command. This is to get stuff working while i figure out how to setup the environment variables and what not!
FROM mcr.microsoft.com/dotnet/core/sdk:2.2
WORKDIR /usr/todo-api/

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy the actual codebase over
COPY . ./

# == Obtaining an argument from docker-compose and setting it as environment variable == #
ARG POSTGRES_CONNECTION_STRING
ENV ConnectionStrings__PostgresConnectionString=${POSTGRES_CONNECTION_STRING}

# NOTE: Since our app uses a code-first database, you will need to run EF migrations to setup postgres after running docker-compose up.
# At the current time, this must be done manually:
# --- Step 1: Bring up the system with 'docker-compose up'
# --- Step 2: Open a terminal in the api container with 'docker exec -it <container id> sh'
# --- Step 3: Set and export a ASPNETCORE_ENVIRONMENT environment variable in the shell to 'DockerDevelopment'. This is needed so when
#             the migrations tool runs, it uses the correct configs (i.e. the Postgres connection string, instead of the prod or dev one).
#             Do this with 'export ASPNETCORE_ENVIRONMENT=DockerDevelopment'
# --- Step 4: Run 'dotnet ef migrations add <name for migration>'
# --- Step 5: Run 'dotnet ef database update'
# --- Step 6: Exit the terminal and restart the api container. This needs to be restarted after performing the migrations for some reason,
#             otherwise you will an Intermediate lanugage error when the app tries to connect to postgres.

# ========================================================================================================================================

# Run the app in directly from the source code (NOT A PRODUCTION TECHNIQUE).
# This runs the app without creating a published build and is useful for debugging.
# When ASP.NET Core apps are run in this fashion, it reads additional configuration from the 'launchSettings.json', which I have setup
# specifically with a 'docker learning' profile. This profile sets the ASPNETCORE_ENVIRONMENT variable to be "DockerDevelopment", which in
# turn makes the app user an in-memory database, and sets up CORS to accept the todos-app frontend running from a container, etc.
# This is a temporary measure to get it up and running easily so I can test out docker-compose and stuff. Once this works, i'll replace this
# Dockerfile with something which creates a release build, setting up an environment variable in docker-compose.yml to make the app connect to
# a postgres database, run 'dotnet ef migrations add XXX' and 'dotnet ef database update', and so on.

# The 'urls' parameter specifies configuration to the app which makes it expose on public network ports, not just localhost, which is usually the
# case when running asp.net core on kestrel with 'dotnet run'.
# SEE: https://weblog.west-wind.com/posts/2016/sep/28/external-network-access-to-kestrel-and-iis-express-in-aspnet-core

# NOTE: Replaced the --urls flag with just specifying the listening addresses directly in launchSettings.json, such that they use ip 0.0.0.0 which
# means "any ip", rather than localhost, because binding to localhost does not expose itself externally by nature.
CMD ["dotnet", "run", "--launch-profile", "DockerLearning"]