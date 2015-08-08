#!/usr/bin/perl
use strict;

use Mojolicious::Lite;

# catch JSON requests to state API and respond with next state respond with a 
# 405 METHOD NOT ALLOWED to other request types
get '/test/:state' => sub {
  my $c = shift;
  my $state = $c->stash('state');
  $state += 1;
  
  # output response header to show that we are accepting JSON only
  $c->res->headers->accept('application/json'); 
  $c->respond_to(json => { json => { next => $state }}, 
                 any  => { data => '', status => 405 });
};

# catch any other requests and return 404 NOT FOUND
any '/(*)' => sub {
    my $c = shift;
    $c->render(data => '', status => 404);
};

app->start;
