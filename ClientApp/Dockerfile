# Use a base image with node on it, since we need it to npm install our react stuff. This will be used as the build stage.
# Once the application has been built, we won't need our source-code and node_modules dependencies anymore; so we will use
# a separate runtime stage to serve our application statically from a simple server.
FROM node:10 AS build-stage

# Setup our working directory inside the image. This will be where we copy our application code to!
WORKDIR /usr/todo-app/

# Copy our package.json and package-lock.json into the working directory.
# The reason we are not copying all of our code yet is so that we can npm install BEFORE we copy our application
# code into the image. That way, when we make code changes, we won't have to re-install our npm packaged when the
# container rebuilds. Remember, each Dockerfile step creates a new cached image from which to rebuild from, which
# is why this ordering works!
COPY ./package*.json ./

# install npm dependencies. Since we didn't copy our package files into ./ClientApp, but rather, the working dir
# directly, we just run the command in the working dir.
RUN npm install

# Now that npm has installed our packages, lets copy our application code into the image
# NOTE: We have specified files to ignore in the .dockerignore file, e.g. node_modules.
COPY ./ ./

# Before we build the app, we have to setup our environment variables, since they get bundled into the build-package.
# To set environment vars in react, we name them with the REACT_APP prefix. See: https://create-react-app.dev/docs/adding-custom-environment-variables

# == Obtaining an argument from docker-compose and setting it as a build time environment variable == #
ARG REACT_APP_API_ADDRESS
ENV REACT_APP_API_ADDRESS=${REACT_APP_API_ADDRESS}

# NOTE: we could run leave this here, as a 'development' container, by setting CMD to do npm start (Running the react development server)
# But instead, for this we want to run a statically served build, so we are going to execute react-script to build into a servable, static asset.
RUN npm run build

# Runtime-stage; simply copy our built app from the build stage here, install 'serve', and away we go!
# Note that we are using the same base image for the runtime stage as the build stage; this is because we are using 'serve' to serve our application,
# which is a node-app. Specifying another base image will create a new 'phase' regardless of this fact.
FROM node:10 AS runtime

# Globally install 'serve' which we will use as a static server. We want to do this first, so that it does need
# get rebuilt when we make code changes or npm project-dependcy changes in our package-lock.json
RUN npm install -g serve

COPY --from=build-stage /usr/todo-app/build ./build

# Inform docker that this image listens on port 3000 when run as a container. This will be what we specify our react app to be served from.
# In the 'primary process' using the CMD instruction.
EXPOSE 3000

# Set our images 'primary process' to serve the constructed react application using the 'serve' node application we installed 
# into our image at the beginning. We are telling it to listen on port 3000
CMD ["serve", "-s", "build", "-l", "3000"]